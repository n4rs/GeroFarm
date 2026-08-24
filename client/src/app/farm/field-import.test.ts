import assert from "node:assert/strict";
import test from "node:test";
import { parseCoordinateText } from "./field-import";

test("parses KML coordinates and closes open rings", () => {
  const polygon = parseCoordinateText("-8,39,0 -7.9,39,0 -7.9,39.1,0 -8,39.1,0");
  assert.equal(polygon?.coordinates[0].length, 5);
  assert.deepEqual(polygon?.coordinates[0][0], polygon?.coordinates[0].at(-1));
  assert.equal(parseCoordinateText("-8,39 -7.9,39"), null);
});
