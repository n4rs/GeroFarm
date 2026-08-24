import assert from "node:assert/strict";
import test from "node:test";
import { createFarmHoldingSchema, isTimeZone, normalizeFarmHoldingCode, updateFarmHoldingSchema } from "./farm-holdings";

test("normalizes farm holding codes into stable uppercase identifiers", () => {
  assert.equal(normalizeFarmHoldingCode(" exp-01 "), "EXP01");
  assert.equal(normalizeFarmHoldingCode("Évora"), "EVORA");
  assert.equal(createFarmHoldingSchema.parse({ name: "Monte Claro", code: " mc ", timezone: "Europe/Lisbon" }).code, "MC");
});

test("validates IANA timezones and bounded updates", () => {
  assert.equal(isTimeZone("Atlantic/Azores"), true);
  assert.equal(isTimeZone("Europe/Not-A-Place"), false);
  assert.throws(() => createFarmHoldingSchema.parse({ name: "A", code: "!", timezone: "invalid" }));
  assert.throws(() => updateFarmHoldingSchema.parse({}));
});
