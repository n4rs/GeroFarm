import assert from "node:assert/strict";
import test from "node:test";
import { allocateResourceHours, createOperationCatalogItemSchema, normalizedCatalogLabel, selectSoilAnalysesByField } from "./operation-extensions";

const a = crypto.randomUUID(), b = crypto.randomUUID();
test("resource hours default by effective area without duplicating the physical total", () => {
  const rows = allocateResourceHours(8, [{ fieldId: a, areaHa: 1 }, { fieldId: b, areaHa: 3 }], []);
  assert.deepEqual(rows.map(row => row.hours), [2, 6]);
  assert.equal(rows.reduce((sum, row) => sum + row.hours, 0), 8);
  assert.ok(rows.every(row => row.source === "effective_area"));
});
test("resource destination overrides preserve the shared total", () => {
  const rows = allocateResourceHours(8, [{ fieldId: a, areaHa: 1 }, { fieldId: b, areaHa: 3 }], [{ fieldId: a, hours: 5 }, { fieldId: b, hours: 3 }]);
  assert.deepEqual(rows.map(row => row.hours), [5, 3]);
  assert.throws(() => allocateResourceHours(8, [{ fieldId: a, areaHa: 1 }, { fieldId: b, areaHa: 3 }], [{ fieldId: a, hours: 8 }]), /cover every destination/);
});
test("three destinations use canonical four-decimal accumulation and the last absorbs the remainder",()=>{
  const fields=Array.from({length:3},()=>crypto.randomUUID()),rows=allocateResourceHours(1,fields.map(fieldId=>({fieldId,areaHa:1})),[]);
  assert.deepEqual(rows.map(row=>row.hours),[0.3333,0.3333,0.3334]);
  assert.equal(Math.round(rows.reduce((sum,row)=>sum+row.hours,0)*10000),10000);
});
test("one hundred destinations retain exactly one canonical shared total",()=>{
  const rows=allocateResourceHours(7.1234,Array.from({length:100},(_,index)=>({fieldId:crypto.randomUUID(),areaHa:index+1})),[]);
  assert.equal(rows.length,100);
  assert.equal(rows.reduce((sum,row)=>sum+Math.round(row.hours*10000),0),71234);
  assert.ok(rows.every(row=>(row.hours.toString().split(".")[1]?.length||0)<=4));
});
test("catalog labels use one canonical whitespace and collision key",()=>{
  const parsed=createOperationCatalogItemSchema.parse({kind:"soil_action",label:"  Mobilização\t  Localizada  "});
  assert.equal(parsed.label,"Mobilização Localizada");
  assert.equal(normalizedCatalogLabel(parsed.label),normalizedCatalogLabel("mobilização localizada"));
});
test("soil analyses are selected independently for two fields",()=>{
  const fieldA=crypto.randomUUID(),fieldB=crypto.randomUUID(),sampleA=crypto.randomUUID(),sampleB=crypto.randomUUID(),resultA=crypto.randomUUID(),resultB=crypto.randomUUID();
  const selected=selectSoilAnalysesByField({fieldIds:[fieldA,fieldB],operationDate:"2026-08-25",samples:[{id:sampleA,sampledOn:"2026-01-01",fieldIds:[fieldA]},{id:sampleB,sampledOn:"2026-02-01",fieldIds:[fieldB]}],results:[{id:resultA,sampleId:sampleA,resultedOn:"2026-01-10",validUntil:"2026-12-31"},{id:resultB,sampleId:sampleB,resultedOn:"2026-02-10",validUntil:"2026-12-31"}],choices:[]});
  assert.deepEqual(selected.selections,[{fieldId:fieldA,resultId:resultA},{fieldId:fieldB,resultId:resultB}]);assert.deepEqual(selected.warnings,[]);
});
test("soil analysis coverage warns per missing field and rejects invalid choices",()=>{
  const fieldA=crypto.randomUUID(),fieldB=crypto.randomUUID(),sample=crypto.randomUUID(),result=crypto.randomUUID(),base={fieldIds:[fieldA,fieldB],operationDate:"2026-08-25",samples:[{id:sample,sampledOn:"2026-01-01",fieldIds:[fieldA]}],results:[{id:result,sampleId:sample,resultedOn:"2026-01-10",validUntil:"2026-12-31"}]};
  const selected=selectSoilAnalysesByField({...base,choices:[]});assert.deepEqual(selected.selections,[{fieldId:fieldA,resultId:result}]);assert.deepEqual(selected.warnings,[{fieldId:fieldB,code:"missing_valid_analysis"}]);
  assert.throws(()=>selectSoilAnalysesByField({...base,choices:[{fieldId:fieldB,resultId:result}]}),/not valid/);
  assert.throws(()=>selectSoilAnalysesByField({...base,choices:[],legacyResultId:result}),/cover every operation field/);
});
