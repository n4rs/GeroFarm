import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../migrations/0022_operation_catalogs_resource_allocations.sql", import.meta.url), "utf8");
const repository = await readFile(new URL("./operations.ts", import.meta.url), "utf8");
const extensions = await readFile(new URL("../shared/operation-extensions.ts", import.meta.url), "utf8");

test("custom operation catalog is tenant isolated, deactivatable and never deletable", () => {
  assert.match(migration, /operation_catalog_items_tenant_isolation/);
  assert.match(migration, /REVOKE DELETE ON "farm"\."operation_catalog_items"/);
  assert.match(migration, /operation_catalog_identity_guard/);
  assert.match(migration, /normalized_label[\s\S]+UNIQUE/u);
  assert.match(migration, /INSERT INTO "farm"\."operation_catalog_items"[\s\S]+operation_soil_preparations/u);
  assert.match(repository, /OPERATION_CATALOG_ITEM_INACTIVE/);
  assert.match(repository, /operation_catalog\.deactivated/);
  assert.match(repository, /normalizedLabel}=lower\(regexp_replace/);
  assert.match(repository, /onConflictDoNothing\(\)\.returning\(\)/);
  assert.match(repository, /OPERATION_CATALOG_ITEM_EXISTS/);
});

test("soil analysis and resource totals remain frozen and database constrained", () => {
  assert.match(migration, /operation_soil_analysis_coverage_guard/);
  assert.match(migration, /sampleFieldIds/);
  assert.match(migration, /operation_soil_analysis_immutable/);
  assert.match(migration, /missing_valid_analysis/);
  assert.match(migration, /validate_resource_allocation/);
  assert.match(migration, /destination hours must equal total hours/);
  assert.match(migration, /cover each physical destination exactly once/);
  assert.match(extensions, /SOIL_ANALYSIS_NOT_VALID/);
  assert.match(repository, /selectSoilAnalysesByField/);
  assert.match(repository, /soilAnalysisSnapshots=selected\.selections/);
  assert.match(repository, /resourceAllocations\(input\.workerAssignments/);
});
