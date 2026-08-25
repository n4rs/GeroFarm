import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../migrations/0021_domain_invariants.sql", import.meta.url), "utf8");
const operations = await readFile(new URL("./operations.ts", import.meta.url), "utf8");

test("domain invariants make voiding, lifecycle dates and lot sequences durable", () => {
  assert.match(migration, /audit\.occurred_at/);
  assert.doesNotMatch(migration, /audit\.created_at/);
  assert.match(migration, /operations_void_state_valid/);
  assert.match(migration, /operation_void_guard/);
  assert.match(migration, /operation_consumptions_status_valid[\s\S]+reversed/u);
  assert.match(migration, /inventory_movements_consumption_lot_reversal_once/);
  assert.match(migration, /farm_cost_active_operation_guard/);
  assert.match(migration, /plantation_kind_compatibility_guard/);
  assert.match(migration, /crop_period_lifecycle_guard/);
  assert.match(migration, /daterange[\s\S]+cannot overlap or restart/u);
  assert.match(migration, /harvest_lot_sequences_org_prefix_unique/);
  assert.match(migration, /laboratory_result_dates_guard/);
  assert.match(migration, /REVOKE DELETE ON "farm"\."operations"/);
  assert.match(operations, /kind:"adjustment_in"/);
  assert.match(operations, /status:"reversed"/);
  assert.match(operations, /reversedCosts:reversedCosts\.length/);
});
