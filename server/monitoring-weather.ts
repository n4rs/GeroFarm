import type { Request } from "express";
import type { AutomaticMonitoringWeather, MonitoringWeatherSubject } from "@shared/agronomy";
import type { WeatherDataPoint, WeatherReport } from "@shared/weather";
import { CoreApiError } from "./gero-core-client";
import type { WeatherStore } from "./weather-store";
import { synchronizeWeatherSeries } from "./weather-sync";

const capturedAt=()=>new Date().toISOString();
const unavailable=(reason:Extract<AutomaticMonitoringWeather,{status:"unavailable"}>["reason"],requestedAt:string,subject:MonitoringWeatherSubject|null):AutomaticMonitoringWeather=>({status:"unavailable",reason,requestedAt,capturedAt:capturedAt(),subject});

function weatherPoint(points:WeatherDataPoint[],requestedAt:string):WeatherDataPoint|null{
  if(!points.length)return null;
  const requested=Date.parse(requestedAt), ranked=points.map(point=>({point,distance:Math.abs(Date.parse(point.at)-requested)})).filter(item=>Number.isFinite(item.distance)).sort((a,b)=>a.distance-b.distance);
  return ranked[0]&&ranked[0].distance<=60*60*1000?ranked[0].point:null;
}

export async function captureMonitoringWeather(req:Request,organizationId:string,subject:MonitoringWeatherSubject|null,requestedAt:string,historyAllowed=true,store?:WeatherStore):Promise<AutomaticMonitoringWeather>{
  if(!subject)return unavailable("no_plantation",requestedAt,null);
  if(!historyAllowed)return unavailable("plan_history_unavailable",requestedAt,subject);
  if(!store)return unavailable("core_unavailable",requestedAt,subject);
  try{
    const date=requestedAt.slice(0,10),series=await synchronizeWeatherSeries(req,store,organizationId,subject.subjectId,subject.cropPeriodId,date,date);
    const period=series.stationPeriods.find(item=>date>=item.from&&date<=item.to);
    if(!period)return unavailable("no_station",requestedAt,subject);
    const point=weatherPoint(series.hourly as WeatherDataPoint[],requestedAt);
    if(!point)return unavailable("data_unavailable",requestedAt,subject);
    const values={temperatureC:point.temperatureC,apparentTemperatureC:point.apparentTemperatureC,precipitationProbability:point.precipitationProbability,precipitationIntensityMmPerHour:point.precipitationIntensityMmPerHour,precipitationAccumulationMm:point.precipitationAccumulationMm,humidityPercent:point.humidityPercent,windSpeedKph:point.windSpeedKph,windGustKph:point.windGustKph,windBearingDegrees:point.windBearingDegrees,solarRadiationWm2:point.solarRadiationWm2};
    if(Object.values(values).every(value=>value===null))return unavailable("data_unavailable",requestedAt,subject);
    const {station,assignment}=period;
    return{status:"available",requestedAt,capturedAt:capturedAt(),subject,provenance:{requestedFor:requestedAt,station:{id:station.id,name:station.name,latitude:station.latitude,longitude:station.longitude,elevationM:station.elevationM,timezone:station.timezone},assignment:{id:assignment.id,effectiveFrom:assignment.effectiveFrom,effectiveTo:assignment.effectiveTo}},fetchedAt:series.meta.fetchedAt||capturedAt(),cached:series.meta.cached,stale:series.meta.stale,cacheStatus:series.meta.cache.status==="mixed"||series.meta.cache.status==="not_requested"?"miss":series.meta.cache.status,temporalStatus:point.temporalStatus,valueSource:point.valueSource,values};
  }catch(error){
    if(error instanceof CoreApiError){
      if(error.status===403)return unavailable("plan_history_unavailable",requestedAt,subject);
      if(error.status===404&&/STATION/i.test(error.code||""))return unavailable("no_station",requestedAt,subject);
      if(error.status===404||error.status===422)return unavailable("data_unavailable",requestedAt,subject);
    }
    return unavailable("core_unavailable",requestedAt,subject);
  }
}
