import assert from "node:assert/strict";
import test from "node:test";
import { allocateResourceHours } from "./operation-extensions";

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
