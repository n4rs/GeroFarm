import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("one Core organization maps to one tenant-isolated agricultural holding", async () => {
  const migration = await readFile(new URL("../migrations/0019_single_holding.sql", import.meta.url), "utf8");
  const schema = await readFile(new URL("../shared/schema.ts", import.meta.url), "utf8");
  const repository = await readFile(new URL("./farm-holdings.ts", import.meta.url), "utf8");
  assert.match(migration, /GROUP BY "organization_id"[\s\S]*HAVING count\(\*\) > 1/u);
  assert.match(migration, /CREATE UNIQUE INDEX "farm_holdings_organization_unique"[\s\S]*\("organization_id"\)/u);
  assert.doesNotMatch(migration, /\b(?:DROP|DELETE|TRUNCATE)\b/iu);
  assert.match(schema, /uniqueIndex\("farm_holdings_organization_unique"\)\.on\(table\.organizationId\)/u);
  assert.match(repository, /onConflictDoNothing\(\{ target: farmHoldings\.organizationId \}\)/u);
  assert.match(repository, /FARM_HOLDING_ALREADY_EXISTS/u);
});
