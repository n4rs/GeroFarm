import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeliveredNutrients, calculatePlannedNutrients, createFertilizationPlanSchema, emptyNutrients, planWarnings } from "./fertilization-plans";
import type { OperationDto } from "./operations";

const fieldA = crypto.randomUUID();
const fieldB = crypto.randomUUID();
const plantationA = crypto.randomUUID();

test("a general fertilization plan creates distinct field targets without planned operations", () => {
  const input = createFertilizationPlanSchema.parse({ name: "Olival 2026", cultureId: "pt-drap-001", startsOn: "2026-01-01", endsOn: "2026-12-31", fields: [{ fieldId: fieldA, plantationId: plantationA, targetType: "current_campaign", targetLabel: "Campanha 2026", areaHa: 2, objectivesKgHa: { nTotal: 80, p2o5: 30, k2o: 90, cao: 0, mgo: 0, so3: 0 }, plannedSources: [] }] });
  assert.equal(input.fields.length, 1);
  assert.equal("operations" in input, false);
});

test("performed nutrients are projected once from the physical operation destination", () => {
  const operation = { id: crypto.randomUUID(), code: "OP260001", status: "performed", type: "fertilization", performedAt: "2026-05-01T10:00:00Z", createdAt: "2026-05-01T10:00:00Z", destinations: [{ fieldId: fieldA, plantationId: plantationA, areaHa: 2, percentage: 40 }, { fieldId: fieldB, areaHa: 3, percentage: 60 }], workerIds: [], equipmentIds: [], contractorIds: [], fertilization: { mode: "base", products: [{ name: "NPK", category: "fertilizer", quantitySource: "total", dosePerHa: 100, totalQuantity: 500, unit: "kg", compositionKnown: true, composition: { micronutrients: {} }, destinationApplications: [{ fieldId: fieldA, plantationId: plantationA, dosePerHa: 100, totalQuantity: 200 }, { fieldId: fieldB, dosePerHa: 100, totalQuantity: 300 }], nutrientTotalsKg: { nTotal: 50, p2o5: 100 } }] } } as OperationDto;
  const result = calculateDeliveredNutrients([operation], { fieldId: fieldA, plantationId: plantationA, areaHa: 2 }, "2026-01-01", "2026-12-31");
  assert.equal(result.operationCount, 1);
  assert.equal(result.deliveredKg.nTotal, 20);
  assert.equal(result.deliveredKgHa.nTotal, 10);
  assert.equal(result.deliveredKg.p2o5, 40);
});

test("planned sources and an explicitly selected cover crop remain estimates", () => {
  const objectivesKgHa = { ...emptyNutrients(), nTotal: 100, k2o: 80 };
  const result = calculatePlannedNutrients({ objectivesKgHa, plannedSources: [{ name: "Composto", nutrientsKgHa: { ...emptyNutrients(), nTotal: 25, k2o: 15 } }], includeCoverCrop: true, coverCropContributionKgHa: { ...emptyNutrients(), nTotal: 20 } });
  assert.equal(result.plannedKgHa.nTotal, 45);
  assert.equal(result.plannedBalanceKgHa.nTotal, 55);
  assert.equal(result.plannedBalanceKgHa.k2o, 65);
});

test("missing and stale snapshots warn without blocking the nutrient balance", () => {
  const common = { objectivesKgHa: { ...emptyNutrients(), nTotal: 20 }, deliveredKgHa: { ...emptyNutrients(), nTotal: 25 }, unknownCompositionOperationCount: 1 };
  assert.deepEqual(planWarnings({ ...common, irrigationSectorSnapshot: undefined, nitrateAnalysisSnapshot: undefined }, "2026-12-31"), ["missing_irrigation_sector", "missing_nitrate_analysis", "unknown_composition", "objective_exceeded"]);
  assert.ok(planWarnings({ ...common, irrigationSectorSnapshot: "Norte", nitrateAnalysisSnapshot: { sampledOn: "2024-01-01", nitrateMgL: 12 } }, "2026-12-31").includes("stale_nitrate_analysis"));
});
