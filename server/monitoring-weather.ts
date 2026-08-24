import type { Request } from "express";
import type { AutomaticMonitoringWeather, MonitoringWeatherSubject } from "@shared/agronomy";
import type { WeatherDataPoint, WeatherReport } from "@shared/weather";
import { CoreApiError, geroCore } from "./gero-core-client";

const capturedAt=()=>new Date().toISOString();
const unavailable=(reason:Extract<AutomaticMonitoringWeather,{status:"unavailable"}>["reason"],requestedAt:string,subject:MonitoringWeatherSubject|null):AutomaticMonitoringWeather=>({status:"unavailable",reason,requestedAt,capturedAt:capturedAt(),subject});

function weatherPoint(report:WeatherReport,requestedAt:string):WeatherDataPoint|null{
  const points=[report.current,...report.hourly.data].filter((point):point is WeatherDataPoint=>!!point);
  if(!points.length)return null;
  const requested=Date.parse(requestedAt), ranked=points.map(point=>({point,distance:Math.abs(Date.parse(point.at)-requested)})).filter(item=>Number.isFinite(item.distance)).sort((a,b)=>a.distance-b.distance);
  return ranked[0]&&ranked[0].distance<=60*60*1000?ranked[0].point:null;
}

export async function captureMonitoringWeather(req:Request,organizationId:string,subject:MonitoringWeatherSubject|null,requestedAt:string,historyAllowed=true):Promise<AutomaticMonitoringWeather>{
  if(!subject)return unavailable("no_plantation",requestedAt,null);
  if(!historyAllowed)return unavailable("plan_history_unavailable",requestedAt,subject);
  try{
    const report=await geroCore.weather.get<WeatherReport>(req,organizationId,`subjects/${subject.subjectType}/${encodeURIComponent(subject.subjectId)}/report?${new URLSearchParams({at:requestedAt})}`);
    if(!report.station)return unavailable("no_station",requestedAt,subject);
    const point=weatherPoint(report,requestedAt);
    if(!point)return unavailable("data_unavailable",requestedAt,subject);
    const values={temperatureC:point.temperatureC,apparentTemperatureC:point.apparentTemperatureC,precipitationProbability:point.precipitationProbability,precipitationIntensityMmPerHour:point.precipitationIntensityMmPerHour,precipitationAccumulationMm:point.precipitationAccumulationMm,humidityPercent:point.humidityPercent,windSpeedKph:point.windSpeedKph,windGustKph:point.windGustKph,windBearingDegrees:point.windBearingDegrees,solarRadiationWm2:point.solarRadiationWm2};
    if(Object.values(values).every(value=>value===null))return unavailable("data_unavailable",requestedAt,subject);
    const {station,assignment,requestedFor}=report.station;
    return{status:"available",requestedAt,capturedAt:capturedAt(),subject,provenance:{requestedFor,station:{id:station.id,name:station.name,latitude:station.latitude,longitude:station.longitude,elevationM:station.elevationM,timezone:station.timezone},assignment:assignment?{id:assignment.id,effectiveFrom:assignment.effectiveFrom,effectiveTo:assignment.effectiveTo}:null},fetchedAt:report.meta.fetchedAt,cached:report.meta.cached,stale:report.meta.stale,cacheStatus:report.meta.cache.status,temporalStatus:point.temporalStatus,valueSource:point.valueSource,values};
  }catch(error){
    if(error instanceof CoreApiError){
      if(error.status===403)return unavailable("plan_history_unavailable",requestedAt,subject);
      if(error.status===404&&/STATION/i.test(error.code||""))return unavailable("no_station",requestedAt,subject);
      if(error.status===404||error.status===422)return unavailable("data_unavailable",requestedAt,subject);
    }
    return unavailable("core_unavailable",requestedAt,subject);
  }
}
