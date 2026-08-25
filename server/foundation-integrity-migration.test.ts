import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("foundation hardening closes RLS, concurrency and tenant-reference gaps", async () => {
  const migration = await readFile(new URL("../migrations/0020_foundation_integrity.sql", import.meta.url), "utf8");
  for (const table of ["inventory_products", "inventory_lots", "operation_consumptions", "inventory_movements", "farm_costs", "weather_syncs", "weather_samples", "weather_agronomic_profiles", "weather_agronomic_results"]) {
    assert.match(migration, new RegExp(`ALTER TABLE "farm"\\."${table}" FORCE ROW LEVEL SECURITY`));
  }
  assert.match(migration, /REVOKE DELETE[\s\S]+FROM "gero_farm_app"/u);
  assert.match(migration, /crop_periods_one_active_per_plantation[\s\S]+WHERE "status"='active'/u);
  assert.match(migration, /weather_profiles_one_open_per_campaign[\s\S]+WHERE "valid_to" IS NULL/u);
  assert.match(migration, /irrigation_records_state_consistent/u);
  for (const constraint of ["operation_workers_same_tenant_fk", "operation_equipment_same_tenant_fk", "operation_contractors_same_tenant_fk"]) assert.match(migration, new RegExp(constraint));
  assert.match(migration, /enforce_same_tenant_reference/u);
  assert.match(migration, /pg_constraint[\s\S]+constraint_row\.contype = 'f'/u);
  assert.match(migration, /Cannot enforce tenant integrity[\s\S]+cross-tenant rows exist/u);
  assert.match(migration, /NO FORCE ROW LEVEL SECURITY[\s\S]+Cannot enforce tenant integrity[\s\S]+FORCE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE TABLE "farm"\."idempotency_requests"/u);
  assert.match(migration, /idempotency_requests_org_key_unique/u);
  assert.match(migration, /idempotency_requests_tenant_isolation/u);
});

test("destructive migration runner is pinned to the dedicated database identity", async () => {
  const runner = await readFile(new URL("../script/migrate.ts", import.meta.url), "utf8");
  assert.match(runner, /current_database\(\), current_user/u);
  assert.match(runner, /bootstrapTarget\.database/u);
  assert.match(runner, /bootstrapTarget\.migratorUser/u);
});

test("harvest operation and agronomic record share one transaction", async () => {
  const source = await readFile(new URL("./agronomy.ts", import.meta.url), "utf8");
  const method = source.slice(source.indexOf("async createHarvest"), source.indexOf("async currentNotebook"));
  assert.doesNotMatch(method, /operations\.create/u);
  assert.match(method, /withOrganizationTransaction[\s\S]+tx\.insert\(farmOperations\)[\s\S]+tx\.insert\(harvests\)/u);
});

test("issued notebook snapshot and persistence share a repeatable-read transaction", async () => {
  const source = await readFile(new URL("./agronomy.ts", import.meta.url), "utf8");
  const method = source.slice(source.indexOf("async issueNotebook"), source.indexOf("async deleteNotebook"));
  assert.match(method, /withOrganizationTransaction[\s\S]+current\(context,scope,tx\)[\s\S]+tx\.insert\(fieldNotebooks\)/u);
  assert.match(method, /isolationLevel:\s*"repeatable read"/u);
});
