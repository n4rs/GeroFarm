import { createHash } from "node:crypto";
import type {
  AgronomicWeatherAccumulation,
  AgronomicWeatherIndicators,
  WeatherAgronomicProfile,
  WeatherBaseSeries,
  WeatherSeriesHour,
  WeatherAccumulationMetric,
} from "@shared/weather";

export const AGRONOMIC_ENGINE_VERSION = "gerofarm-agronomy-1.0.0";
export type AgronomicParameters = {
  degreeDayBaseC: number;
  degreeDayUpperC: number | null;
  leafWetnessHumidityPercent: number;
};
const defaults: AgronomicParameters = { degreeDayBaseC: 10, degreeDayUpperC: 30, leafWetnessHumidityPercent: 90 };
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round = (value: number) => Math.round(value * 10000) / 10000;
const dayCount = (from: string, to: string) => Math.floor((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
const localDate = (instant: string, timezone: string | null) => { const parts=Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));return`${parts.year}-${parts.month}-${parts.day}` };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function solarEnergy(hours: WeatherSeriesHour[]) {
  return hours.reduce((sum, point, index) => {
    if (!finite(point.solarRadiationWm2)) return sum;
    const next = hours[index + 1];
    const durationHours = next ? Math.min(1.5, Math.max(0, (Date.parse(next.at) - Date.parse(point.at)) / 3600000)) : 1;
    return sum + point.solarRadiationWm2 * durationHours * 0.0036;
  }, 0);
}

/** FAO-56 daily Penman-Monteith, Allen et al. (1998), equations 6, 13, 23, 35 and 39. */
export function fao56DailyEt0(input: { date: string; latitude: number; elevationM: number; tMinC: number; tMaxC: number; humidityPercent: number; windSpeedKph: number; solarMjM2Day: number }) {
  const mean = (input.tMinC + input.tMaxC) / 2;
  const esMin = 0.6108 * Math.exp(17.27 * input.tMinC / (input.tMinC + 237.3));
  const esMax = 0.6108 * Math.exp(17.27 * input.tMaxC / (input.tMaxC + 237.3));
  const es = (esMin + esMax) / 2, ea = es * input.humidityPercent / 100;
  const delta = 4098 * (0.6108 * Math.exp(17.27 * mean / (mean + 237.3))) / ((mean + 237.3) ** 2);
  const pressure = 101.3 * ((293 - 0.0065 * input.elevationM) / 293) ** 5.26;
  const gamma = 0.000665 * pressure;
  const day = Math.floor((Date.parse(`${input.date}T12:00:00Z`) - Date.UTC(new Date(`${input.date}T12:00:00Z`).getUTCFullYear(), 0, 0)) / 86400000);
  const phi = input.latitude * Math.PI / 180, dr = 1 + 0.033 * Math.cos(2 * Math.PI * day / 365), declination = 0.409 * Math.sin(2 * Math.PI * day / 365 - 1.39);
  const sunset = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(declination))));
  const ra = 24 * 60 / Math.PI * 0.082 * dr * (sunset * Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.sin(sunset));
  const rso = (0.75 + 0.00002 * input.elevationM) * ra;
  const rns = 0.77 * input.solarMjM2Day;
  const sigma = 4.903e-9, tMaxK = input.tMaxC + 273.16, tMinK = input.tMinC + 273.16;
  const rnl = sigma * ((tMaxK ** 4 + tMinK ** 4) / 2) * (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) * (1.35 * Math.min(1, input.solarMjM2Day / Math.max(0.01, rso)) - 0.35);
  const rn = rns - rnl, wind2m = input.windSpeedKph / 3.6;
  return Math.max(0, (0.408 * delta * rn + gamma * 900 / (mean + 273) * wind2m * (es - ea)) / (delta + gamma * (1 + 0.34 * wind2m)));
}

const utahWeight = (t: number) => t <= 1.4 ? 0 : t <= 2.4 ? 0.5 : t <= 9.1 ? 1 : t <= 12.4 ? 0.5 : t <= 15.9 ? 0 : t <= 18 ? -0.5 : -1;
const modifiedWeight = (t: number) => t <= 1.4 ? 0 : t <= 2.4 ? 0.5 : t <= 12.4 ? 1 : t <= 15.9 ? 0.5 : 0;

/** Fishman dynamic chill model, hourly two-step implementation. */
export function dynamicChillPortions(temperaturesC: number[]) {
  let intermediate = 0, portions = 0;
  for (const celsius of temperaturesC) {
    const kelvin = celsius + 273.15;
    const xi = Math.exp(21.6 - 12888 / kelvin) / (1 + Math.exp(15.6 - 12888 / kelvin));
    intermediate += xi;
    const conversion = intermediate * Math.exp(13.9 - 17325 / kelvin);
    if (conversion >= 1) { portions += 1; intermediate = Math.max(0, intermediate - 1); }
  }
  return portions;
}

function makeMetric(name: keyof AgronomicWeatherIndicators, value: number | null, components:{observed:number|null;forecast:number|null}, unit: string, method: string, inputs: Record<string, unknown>, series: WeatherBaseSeries, inputIds: string[]): WeatherAccumulationMetric {
  const requestedDays = dayCount(series.interval.from, series.interval.to);
  const coverage = { requestedDays, availableDays: series.coverage.daysWithDailyData, requestedHours: series.coverage.requestedHours, availableHours: series.coverage.availableHours, gaps: series.coverage.gaps };
  const payload = { name, method, version: AGRONOMIC_ENGINE_VERSION, inputs, inputIds, interval: series.interval, coverage };
  return { value: value === null ? null : round(value), components:{observed:components.observed===null?null:round(components.observed),forecast:components.forecast===null?null:round(components.forecast)}, unit, method, version: AGRONOMIC_ENGINE_VERSION, valueSource: "estimated", temporalStatus: series.hourly.some(point => point.temporalStatus === "forecast") ? "forecast" : "observed", inputs, state: value === null ? "insufficient_data" : "available", inputHash: hash({...payload,components}), inputIds, interval: { from: series.interval.from, to: series.interval.to }, coverage, provenance: { stationIds: [...new Set(series.stationPeriods.map(period => period.station.id))], fetchedAt: series.meta.fetchedAt ? [series.meta.fetchedAt] : [] } };
}

export function calculateAgronomicAccumulation(series: WeatherBaseSeries, profile: WeatherAgronomicProfile[]|WeatherAgronomicProfile|null, campaignId: string | null): AgronomicWeatherAccumulation {
  const profiles=Array.isArray(profile)?profile:profile?[profile]:[];
  const parametersFor=(instant:string)=>{const selected=profiles.filter(item=>instant>=item.validFrom&&(!item.validTo||instant<item.validTo)).at(-1);return{...defaults,...(selected?.parameters||{})} as AgronomicParameters};
  const hours = [...series.hourly].sort((a, b) => a.at.localeCompare(b.at));
  const temperatures = hours.map(point => point.temperatureC).filter(finite);
  const solar = solarEnergy(hours);
  const station = series.stationPeriods[0]?.station;
  const byDay = new Map<string, WeatherSeriesHour[]>();
  for (const hour of hours) { const date = localDate(hour.at, series.timezone); byDay.set(date, [...(byDay.get(date) || []), hour]); }
  let et0 = 0, et0Days = 0,et0Observed=0,et0Forecast=0,et0ObservedDays=0,et0ForecastDays=0;
  if (station) for (const day of series.daily) {
    const dailyHours = byDay.get(day.date) || [], solarMj = solarEnergy(dailyHours);
    const humidity = finite(day.humidityPercent) ? day.humidityPercent : average(dailyHours.map(item => item.humidityPercent));
    const wind = finite(day.windSpeedKph) ? day.windSpeedKph : average(dailyHours.map(item => item.windSpeedKph));
    if (finite(day.temperatureMinC) && finite(day.temperatureMaxC) && finite(humidity) && finite(wind) && solarMj > 0) { const value=fao56DailyEt0({ date: day.date, latitude: station.latitude, elevationM: day.elevationM ?? station.elevationM ?? 0, tMinC: day.temperatureMinC, tMaxC: day.temperatureMaxC, humidityPercent: humidity, windSpeedKph: wind, solarMjM2Day: solarMj });et0 += value;et0Days += 1;if(day.temporalStatus==="forecast"){et0Forecast+=value;et0ForecastDays+=1}else{et0Observed+=value;et0ObservedDays+=1} }
  }
  const degreeDays = temperatures.length ? hours.reduce((sum, point) => {if(!finite(point.temperatureC))return sum;const parameters=parametersFor(point.at);return sum + Math.max(0, Math.min(point.temperatureC, parameters.degreeDayUpperC ?? Infinity) - parameters.degreeDayBaseC) / 24}, 0) : null;
  const leafWet = hours.filter(point => {const parameters=parametersFor(point.at);return (finite(point.precipitationIntensityMmPerHour) && point.precipitationIntensityMmPerHour > 0) || (finite(point.humidityPercent) && point.humidityPercent >= parameters.leafWetnessHumidityPercent && finite(point.temperatureC) && finite(point.dewPointC) && point.temperatureC - point.dewPointC <= 2 && (!finite(point.solarRadiationWm2) || point.solarRadiationWm2 < 200))}).length;
  const inputIds = hours.map(point => `${series.stationPeriods.find(period => point.at.slice(0, 10) >= period.from && point.at.slice(0, 10) <= period.to)?.station.id || "unassigned"}:hourly:${point.at}`);
  const observed=hours.filter(point=>point.temporalStatus==="observed"),forecast=hours.filter(point=>point.temporalStatus==="forecast"),solarObserved=solarEnergy(observed),solarForecast=solarEnergy(forecast),degreeFor=(points:WeatherSeriesHour[])=>points.filter(point=>finite(point.temperatureC)).reduce((sum,point)=>{const parameters=parametersFor(point.at);return sum+Math.max(0,Math.min(point.temperatureC!,parameters.degreeDayUpperC??Infinity)-parameters.degreeDayBaseC)/24},0),leafFor=(points:WeatherSeriesHour[])=>points.filter(point=>{const parameters=parametersFor(point.at);return(finite(point.precipitationIntensityMmPerHour)&&point.precipitationIntensityMmPerHour>0)||(finite(point.humidityPercent)&&point.humidityPercent>=parameters.leafWetnessHumidityPercent&&finite(point.temperatureC)&&finite(point.dewPointC)&&point.temperatureC-point.dewPointC<=2&&(!finite(point.solarRadiationWm2)||point.solarRadiationWm2<200))}).length;
  const common = { profileParameters:profiles.map(item=>({id:item.id,validFrom:item.validFrom,validTo:item.validTo,parameters:item.parameters})),defaults, hourlySamples: hours.length, dailySamples: series.daily.length };
  const metrics: AgronomicWeatherAccumulation["metrics"] = {
    et0: makeMetric("et0", et0Days ? et0 : null,{observed:et0ObservedDays?et0Observed:null,forecast:et0ForecastDays?et0Forecast:null}, "mm", "fao56-pm-daily", { ...common, validDays: et0Days }, series, inputIds),
    degreeDays: makeMetric("degreeDays", degreeDays,{observed:observed.length?degreeFor(observed):null,forecast:forecast.length?degreeFor(forecast):null}, "°C·day", "hourly-bounded-degree-days", common, series, inputIds),
    chillHoursBelow7_2C: makeMetric("chillHoursBelow7_2C", temperatures.length ? temperatures.filter(value => value < 7.2).length : null,{observed:observed.length?observed.filter(point=>finite(point.temperatureC)&&point.temperatureC<7.2).length:null,forecast:forecast.length?forecast.filter(point=>finite(point.temperatureC)&&point.temperatureC<7.2).length:null}, "h", "chill-hours-7_2c", common, series, inputIds),
    modifiedChillHours: makeMetric("modifiedChillHours", temperatures.length ? temperatures.reduce((sum, value) => sum + modifiedWeight(value), 0) : null,{observed:observed.length?observed.reduce((sum,point)=>sum+(finite(point.temperatureC)?modifiedWeight(point.temperatureC):0),0):null,forecast:forecast.length?forecast.reduce((sum,point)=>sum+(finite(point.temperatureC)?modifiedWeight(point.temperatureC):0),0):null}, "h", "modified-chill-hours", common, series, inputIds),
    utahChillUnits: makeMetric("utahChillUnits", temperatures.length ? temperatures.reduce((sum, value) => sum + utahWeight(value), 0) : null,{observed:observed.length?observed.reduce((sum,point)=>sum+(finite(point.temperatureC)?utahWeight(point.temperatureC):0),0):null,forecast:forecast.length?forecast.reduce((sum,point)=>sum+(finite(point.temperatureC)?utahWeight(point.temperatureC):0),0):null}, "CU", "utah-chill-units", common, series, inputIds),
    dynamicModelChillPortions: makeMetric("dynamicModelChillPortions", temperatures.length ? dynamicChillPortions(temperatures) : null,{observed:observed.length?dynamicChillPortions(observed.map(point=>point.temperatureC).filter(finite)):null,forecast:forecast.length?dynamicChillPortions(forecast.map(point=>point.temperatureC).filter(finite)):null}, "CP", "fishman-dynamic-chill", common, series, inputIds),
    estimatedLeafWetnessHours: makeMetric("estimatedLeafWetnessHours", hours.length ? leafWet : null,{observed:observed.length?leafFor(observed):null,forecast:forecast.length?leafFor(forecast):null}, "h", "gerofarm-leaf-wetness-empirical", common, series, inputIds),
    solarEnergy: makeMetric("solarEnergy", hours.some(point => finite(point.solarRadiationWm2)) ? solar : null,{observed:observed.some(point=>finite(point.solarRadiationWm2))?solarObserved:null,forecast:forecast.some(point=>finite(point.solarRadiationWm2))?solarForecast:null}, "MJ/m²", "shortwave-hourly-integration", common, series, inputIds),
    estimatedPar: makeMetric("estimatedPar", solar > 0 ? solar * 0.45 : null,{observed:solarObserved>0?solarObserved*.45:null,forecast:solarForecast>0?solarForecast*.45:null}, "MJ/m²", "par-45pct-shortwave", common, series, inputIds),
    estimatedDli: makeMetric("estimatedDli", solar > 0 ? solar * 0.45 * 4.57 : null,{observed:solarObserved>0?solarObserved*.45*4.57:null,forecast:solarForecast>0?solarForecast*.45*4.57:null}, "mol/m²", "dli-par-photon-integral", common, series, inputIds),
  };
  const warnings: AgronomicWeatherAccumulation["warnings"] = [];
  if (!series.stationPeriods.length) warnings.push({ code: "STATION_NOT_ASSIGNED", from: series.interval.from, to: series.interval.to, detail: "No station assignment covers this interval." });
  if (!profiles.length||profiles[0].validFrom.slice(0,10)>series.interval.from) warnings.push({ code: "PROFILE_NOT_FOUND", from: series.interval.from, to: profiles[0]?addDays(profiles[0].validFrom.slice(0,10),-1):series.interval.to, detail: "Default versioned parameters were used." });
  if (!series.coverage.complete) warnings.push({ code: "INCOMPLETE_DAY", from: series.interval.from, to: series.interval.to, detail: "The base series contains explicit gaps." });
  if (Object.values(metrics).some(metric => metric.state === "insufficient_data")) warnings.push({ code: "INSUFFICIENT_DATA", from: series.interval.from, to: series.interval.to, detail: "At least one indicator could not be calculated without approximation." });
  const profilePeriods:AgronomicWeatherAccumulation["profilePeriods"]=[];let cursor=series.interval.from;for(const item of profiles){const itemFrom=item.validFrom.slice(0,10)<series.interval.from?series.interval.from:item.validFrom.slice(0,10);if(itemFrom>cursor)profilePeriods.push({from:cursor,to:addDays(itemFrom,-1),profile:null});const itemTo=item.validTo&&item.validTo.slice(0,10)<=series.interval.to?addDays(item.validTo.slice(0,10),-1):series.interval.to;if(itemTo>=itemFrom)profilePeriods.push({from:itemFrom,to:itemTo,profile:item});cursor=addDays(itemTo,1)}if(cursor<=series.interval.to)profilePeriods.push({from:cursor,to:series.interval.to,profile:null});
  return { contractVersion: "2", subject: { ...series.subject, campaignId }, interval: series.interval, coverage: { requestedDays: dayCount(series.interval.from, series.interval.to), availableDays: series.coverage.daysWithDailyData, requestedHours: series.coverage.requestedHours, availableHours: series.coverage.availableHours, complete: series.coverage.complete }, temporalStatus: { observedHours: hours.filter(point => point.temporalStatus === "observed").length, forecastHours: hours.filter(point => point.temporalStatus === "forecast").length }, valueSource: { measuredHours: hours.filter(point => point.valueSource === "measured").length, estimatedHours: hours.filter(point => point.valueSource === "estimated").length }, stationPeriods: series.stationPeriods, profilePeriods, warnings, metrics };
}

function average(values: Array<number | null>) { const valid = values.filter(finite); return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null; }
function addDays(value:string,amount:number){const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
