import assert from "node:assert/strict";
import test from "node:test";
import { createIrrigationSchema, deriveHydraulicValues, isNitrateAnalysisStale, readingDifference, reconcileConsumption, scheduledWeekPerformedAt } from "./irrigation";

test("1 mm equals 10 m3/ha and derives volume, dose, flow and duration", () => {
  assert.deepEqual(deriveHydraulicValues({ areaHa: 2.5, depthMm: 12, flowM3H: 30 }), { areaHa: 2.5, volumeM3: 300, doseM3Ha: 120, depthMm: 12, flowM3H: 30, durationMinutes: 600 });
  assert.equal(deriveHydraulicValues({ areaHa: 4, volumeM3: 200, durationMinutes: 120 }).flowM3H, 100);
});

test("rejects inconsistent independent hydraulic values", () => {
  assert.throws(() => deriveHydraulicValues({ areaHa: 1, volumeM3: 100, depthMm: 20 }), /inconsistent/);
});

test("meter reconciliation never invents allocation", () => {
  assert.deepEqual(reconcileConsumption(120, 90), { measuredM3: 120, registeredM3: 90, differenceM3: 30, differencePercent: 25, undistributedM3: 30 });
  assert.equal(reconcileConsumption(80, 90).undistributedM3, 0);
  assert.throws(() => readingDifference({ valueM3: 100 }, { valueM3: 5, event: "normal" }), /rollover/);
  assert.throws(() => readingDifference({ valueM3: 999 }, { valueM3: 2, event: "rollover" }), /explicit reconciled volume/);
});

test("weekly schedules are distinct from performed irrigation", () => {
  const base = { inputMode: "depth_mm" as const, depthMm: 10, applications: [{ sectorId: crypto.randomUUID(), fieldIds: [crypto.randomUUID()], plantationIds: [] }] };
  assert.equal(createIrrigationSchema.parse({ ...base, kind: "weekly_schedule", scheduledWeekEnd: "2026-08-30" }).kind, "weekly_schedule");
  assert.equal(createIrrigationSchema.safeParse({ ...base, kind: "performed" }).success, false);
});

test("nitrate analyses older than one year warn without blocking", () => {
  assert.equal(isNitrateAnalysisStale("2024-01-01", "2026-01-02T12:00:00Z"), true);
  assert.equal(isNitrateAnalysisStale("2025-10-01", "2026-01-02T12:00:00Z"), false);
});

test("weekly materialization respects the holding timezone",()=>{assert.equal(scheduledWeekPerformedAt("2026-08-30","Europe/Lisbon").toISOString(),"2026-08-30T22:59:59.000Z");assert.equal(scheduledWeekPerformedAt("2026-12-27","Europe/Lisbon").toISOString(),"2026-12-27T23:59:59.000Z")});
