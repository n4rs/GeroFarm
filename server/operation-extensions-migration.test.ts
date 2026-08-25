import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../migrations/0022_operation_catalogs_resource_allocations.sql", import.meta.url), "utf8");
const repository = await readFile(new URL("./operations.ts", import.meta.url), "utf8");

test("custom operation catalog is tenant isolated, deactivatable and never deletable", () => {
  assert.match(migration, /operation_catalog_items_tenant_isolation/);
  assert.match(migration, /REVOKE DELETE ON "farm"\."operation_catalog_items"/);
  assert.match(migration, /INSERT INTO "farm"\."operation_catalog_items"[\s\S]+operation_soil_preparations/u);
  assert.match(repository, /OPERATION_CATALOG_ITEM_INACTIVE/);
  assert.match(repository, /operation_catalog\.deactivated/);
});

test("soil analysis and resource totals remain frozen and database constrained", () => {
  assert.match(migration, /operation_soil_analysis_snapshot_valid/);
  assert.match(migration, /operation_soil_analysis_same_tenant_fk/);
  assert.match(migration, /operation_soil_analysis_immutable/);
  assert.match(migration, /missing_valid_analysis/);
  assert.match(migration, /validate_resource_allocation/);
  assert.match(migration, /destination hours must equal total hours/);
  assert.match(migration, /cover each physical destination exactly once/);
  assert.match(repository, /SOIL_ANALYSIS_NOT_VALID/);
  assert.match(repository, /soilAnalysisSnapshot=\{/);
  assert.match(repository, /resourceAllocations\(input\.workerAssignments/);
});
