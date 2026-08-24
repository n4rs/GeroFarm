import assert from "node:assert/strict";
import test from "node:test";
import { calculateApplicationQuantities, sprayingSchema } from "./spraying";
import { createOperationSchema } from "./operations";

const id = "00000000-0000-4000-8000-000000000001";
const authorization = { fieldId: id, destinationLabel: "Vinha da Encosta", authorized: true, safetyIntervalDays: 14 };

test("a mixed spray tank remains one operation with several independently authorized products", () => {
  const value = sprayingSchema.parse({ method: "spray", sprayVolumeLHa: 500, products: [
    { name: "Fungicida A", category: "phytopharmaceutical", unit: "l", quantitySource: "dose_per_hl", dosePerHl: 0.2, registrationNumber: "AV-1", fracGroup: "3", authorizations: [authorization] },
    { name: "Adubo foliar B", category: "foliar_fertilizer", unit: "kg", quantitySource: "dose_per_ha", dosePerHa: 2, authorizations: [authorization], nutrientSnapshot: { compositionKnown: true, composition: { nTotal: 10 } } },
  ], weather: { source: "unavailable" } });
  assert.equal(value.products.length, 2);
  assert.equal(calculateApplicationQuantities(value.products[0], 3.2, value.sprayVolumeLHa).totalQuantity, 3.2);
  assert.equal(calculateApplicationQuantities(value.products[1], 3.2, value.sprayVolumeLHa).totalQuantity, 6.4);
});

test("legal applicator is classification-driven and warnings never block persistence", () => {
  assert.doesNotThrow(() => sprayingSchema.parse({ method: "spray", sprayVolumeLHa: 400, products: [{ name: "Bioestimulante", category: "biostimulant", unit: "l", quantitySource: "total", totalQuantity: 2, authorizations: [authorization] }], weather: { source: "manual" }, warningsAccepted: true }));
  assert.throws(() => sprayingSchema.parse({ method: "spray", products: [{ name: "X", category: "other", unit: "l", quantitySource: "total", totalQuantity: 1, authorizations: [authorization] }], weather: { source: "unavailable" } }));
});

test("the specialist record is attached to exactly one physical operation",()=>{const spraying={method:"spray",sprayVolumeLHa:300,products:[{name:"Sulfur",category:"phytopharmaceutical",unit:"kg",quantitySource:"dose_per_ha",dosePerHa:2,registrationNumber:"AV-2",authorizations:[authorization]}],weather:{source:"unavailable"}};const operation=createOperationSchema.parse({destinations:[{fieldId:id,areaHa:1,percentage:100}],type:"spraying",performedAt:"2026-08-24T10:00:00+01:00",spraying});assert.equal(operation.type,"spraying");assert.equal(operation.spraying?.products.length,1);assert.throws(()=>createOperationSchema.parse({...operation,type:"fertilization"}));});
