import assert from "node:assert/strict";
import test from "node:test";
import { createFieldSchema, fieldPolygonSchema, normalizeFieldCode } from "./fields";

const geometry = { type: "Polygon" as const, coordinates: [[[-8.01, 39], [-8, 39], [-8, 39.01], [-8.01, 39.01], [-8.01, 39]]] };

test("normalizes field codes to the immutable four-character lot segment", () => {
  assert.equal(normalizeFieldCode("a1"), "00A1");
  assert.equal(createFieldSchema.parse({ holdingId: "18796978-ed75-43f8-95b6-de7515e01d39", name: "Norte", code: "t-1", geometry }).code, "00T1");
  assert.throws(() => createFieldSchema.parse({ holdingId: "18796978-ed75-43f8-95b6-de7515e01d39", name: "Norte", code: "0MIX", geometry }), /Reserved/);
});

test("requires a closed field polygon with three distinct vertices", () => {
  assert.doesNotThrow(() => fieldPolygonSchema.parse(geometry));
  assert.throws(() => fieldPolygonSchema.parse({ type: "Polygon", coordinates: [[[-8, 39], [-8, 40], [-7, 40], [-7, 39]]] }));
});
