import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createApp } from "./app";
import type { FarmRequestContext } from "./farm-context";
import type { FarmHoldingRepository } from "./farm-holdings";
import type { IrrigationRepository } from "./irrigation";
import type { IrrigationOverviewDto } from "@shared/irrigation";

const organizationId="18796978-ed75-43f8-95b6-de7515e01d39",holdingId="91cfeb50-bce1-48c3-a9db-723693c88e7b",sectorId="5fe1ec52-fefe-48b2-bc4f-14701d2c0823",fieldId="f47ac10b-58cc-4372-a567-0e02b2c3d479";
const context:FarmRequestContext={user:{id:"0c9bb34d-acdb-42f0-9918-edeb05a37c9a",email:"owner@example.test",name:"Owner",preferredLocale:"pt-PT",preferences:{timezone:"Europe/Lisbon"},status:"active",emailVerifiedAt:null,platformRoles:[]},organization:{id:organizationId,name:"Gero QA",slug:"gero-qa",status:"active",timezone:"Europe/Lisbon"},membership:{role:"owner",status:"active"}};
const holding:FarmHoldingRepository={async list(){return[]},async create(){throw new Error("unused")},async update(){return null}};

function fakeRepository():IrrigationRepository{const overview:IrrigationOverviewDto={sectors:[],meters:[],readings:[],analyses:[],irrigations:[],reconciliations:[],undistributedConsumptionM3:0};return{
  async overview(){return overview},
  async createSector(_context,input){const row={id:sectorId,...input,areaHa:2,status:"active" as const,createdAt:new Date().toISOString()};overview.sectors.push(row);return row},
  async createMeter(){throw new Error("unused")},async addReading(){throw new Error("unused")},async createAnalysis(){throw new Error("unused")},
  async createIrrigation(_context,input){const row={id:crypto.randomUUID(),...input,status:input.kind==="weekly_schedule"?"scheduled" as const:"performed" as const,performedAt:input.performedAt,areaHa:2,volumeM3:200,doseM3Ha:100,depthMm:10,projectionKinds:["operations","notebook"] as Array<"operations"|"notebook">,createdAt:new Date().toISOString()};overview.irrigations.push(row);return row},
  async finalizeDue(){return 0},async reverse(){return null},
}}

async function withServer(run:(base:string)=>Promise<void>){const server=createServer(createApp({farmHoldingRepository:holding,farmContextResolver:async()=>context,irrigationRepository:fakeRepository()}));await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));try{const address=server.address();assert(address&&typeof address==="object");await run(`http://127.0.0.1:${address.port}`)}finally{await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve()))}}

test("irrigation API creates whole-field sectors and a weekly schedule",async()=>withServer(async(base)=>{const sector=await fetch(`${base}/api/farm/irrigation/sectors`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({holdingId,code:"norte-1",name:"Setor Norte",system:"drip",fieldIds:[fieldId]})});assert.equal(sector.status,201);const schedule=await fetch(`${base}/api/farm/irrigation/records`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"weekly_schedule",scheduledWeekEnd:"2026-08-30",inputMode:"depth_mm",depthMm:10,applications:[{sectorId,fieldIds:[fieldId],plantationIds:[]}],meterAllocations:[]})});assert.equal(schedule.status,201);assert.equal((await schedule.json() as {data:{status:string;projectionKinds:string[]}}).data.status,"scheduled");const listed=await fetch(`${base}/api/farm/irrigation`);assert.equal(listed.headers.get("cache-control"),"no-store")}));

test("irrigation API rejects incomplete hydraulic sources",async()=>withServer(async(base)=>{const response=await fetch(`${base}/api/farm/irrigation/records`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"performed",performedAt:"2026-08-24T12:00:00Z",inputMode:"flow_duration",flowM3H:30,applications:[{sectorId,fieldIds:[fieldId],plantationIds:[]}]})});assert.equal(response.status,400);assert.equal((await response.json() as {code:string}).code,"VALIDATION_ERROR")}));
