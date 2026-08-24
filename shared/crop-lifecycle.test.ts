import assert from "node:assert/strict";
import test from "node:test";
import { createCropPeriodSchema, createPlantationSchema, uprootPlantationSchema } from "./crop-lifecycle";
import { cultureCatalog } from "./crops";

test("plantations require a dated permanent or temporary agronomic lifecycle", () => {
  assert.equal(createPlantationSchema.safeParse({ fieldId: crypto.randomUUID(), cultureId: cultureCatalog[0].id, name: "Abacateiros norte", kind: "permanent", areaHa: 2.5, startedOn: "2026-08-24" }).success, true);
  assert.equal(createPlantationSchema.safeParse({ fieldId: crypto.randomUUID(), cultureId: cultureCatalog[0].id, name: "Invalid", kind: "annual", areaHa: 2.5, startedOn: "2026-08-24" }).success, false);
});
test("periods and definitive uprooting reject incomplete evidence", () => {
  assert.equal(createCropPeriodSchema.safeParse({ plantationId: crypto.randomUUID(), name: "Campanha 2026", startedOn: "2026-01-01" }).success, true);
  assert.equal(uprootPlantationSchema.safeParse({ uprootedOn: "2026-08-24", reason: "" }).success, false);
});
