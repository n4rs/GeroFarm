import assert from "node:assert/strict";
import test from "node:test";
import { cultureCatalog, cultureIds, cultureLotCode, createVarietySchema, formatCount } from "./crops";

test("catalogue contains 106 stable unique culture records", () => {
  assert.equal(cultureCatalog.length, 106);
  assert.equal(cultureIds.size, 106);
  assert.equal(cultureCatalog.filter(({ sourceName }) => sourceName === "Alfarrobeira").length, 1);
});
test("legacy fertilisation figures are not imported", () => assert.deepEqual(Object.keys(cultureCatalog[0]), ["id", "sourceName"]));
test("every stable culture has a unique two-character harvest segment",()=>{const codes=cultureCatalog.map(item=>cultureLotCode(item.id));assert.equal(new Set(codes).size,106);assert.ok(codes.every(code=>/^[A-Z0-9]{2}$/.test(code)))});
test("variety requires a known culture", () => {
  assert.equal(createVarietySchema.safeParse({ cultureId: cultureCatalog[0].id, name: "Hass" }).success, true);
  assert.equal(createVarietySchema.safeParse({ cultureId: "unknown", name: "Hass" }).success, false);
});
test("localized catalogue counts preserve the placeholder", () => assert.equal(formatCount("{count} culturas", 106, "pt-PT"), "106 culturas"));
