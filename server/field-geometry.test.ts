import assert from "node:assert/strict";
import test from "node:test";
import type { FieldPolygon } from "@shared/fields";
import { polygonAreaHa, polygonOverlapAreaHa, polygonSelfIntersects, validateFieldGeometry } from "./field-geometry";

const polygon = (ring: Array<[number, number]>): FieldPolygon => ({ type: "Polygon", coordinates: [ring] });
const first = polygon([[-8.01, 39], [-8, 39], [-8, 39.01], [-8.01, 39.01], [-8.01, 39]]);

test("calculates field area and detects material overlap", () => {
  assert.ok(polygonAreaHa(first) > 90);
  const overlapping = polygon([[-8.005, 39.005], [-7.995, 39.005], [-7.995, 39.015], [-8.005, 39.015], [-8.005, 39.005]]);
  assert.ok(polygonOverlapAreaHa(first, overlapping) > 20);
  const touching = polygon([[-8, 39], [-7.99, 39], [-7.99, 39.01], [-8, 39.01], [-8, 39]]);
  assert.equal(polygonOverlapAreaHa(first, touching), 0);
});

test("rejects self-intersecting and zero-area field geometry", () => {
  const bow = polygon([[-8, 39], [-7.99, 39.01], [-8, 39.01], [-7.99, 39], [-8, 39]]);
  assert.equal(polygonSelfIntersects(bow), true);
  assert.throws(() => validateFieldGeometry(bow), /FIELD_GEOMETRY/);
});
