import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bootstrapTarget, validateBootstrapConnections } from "./database-bootstrap";

const adminUrl = "postgresql://doadmin:admin-secret@cluster.example.test:25060/defaultdb";
const migratorUrl = "postgresql://gero_farm_migrator:migrator-secret@cluster.example.test:25060/gero_farm";

test("pins bootstrap to the dedicated GeroFarm database and roles", () => {
  assert.deepEqual(bootstrapTarget, {
    adminDatabase: "defaultdb",
    adminUser: "doadmin",
    database: "gero_farm",
    migratorUser: "gero_farm_migrator",
    runtimeUser: "gero_farm_app",
  });
  assert.doesNotThrow(() => validateBootstrapConnections({ adminUrl, migratorUrl }));
});

test("rejects a bootstrap aimed at another database or cluster", () => {
  assert.throws(
    () => validateBootstrapConnections({ adminUrl, migratorUrl: migratorUrl.replace("/gero_farm", "/gero_core") }),
    /gero_farm/,
  );
  assert.throws(
    () => validateBootstrapConnections({
      adminUrl,
      migratorUrl: migratorUrl.replace("cluster.example.test", "other.example.test"),
    }),
    /same database cluster/,
  );
});

test("initial migration enforces tenant RLS and least-privilege runtime grants", () => {
  const migration = readFileSync(resolve("migrations/0000_sloppy_dorian_gray.sql"), "utf8");
  assert.match(migration, /ALTER TABLE "farm"\."organizations" FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /CREATE POLICY "organizations_tenant_isolation".*AS RESTRICTIVE/);
  assert.match(migration, /REVOKE ALL ON SCHEMA "farm" FROM PUBLIC/);
  assert.match(migration, /GRANT USAGE ON SCHEMA "farm" TO "gero_farm_app"/);
  assert.match(migration, /ALTER DEFAULT PRIVILEGES FOR ROLE "gero_farm_migrator"/);
});

test("farm holding migration enforces tenant isolation and immutable audit events", () => {
  const migration = readFileSync(resolve("migrations/0001_farm_holdings.sql"), "utf8");
  assert.match(migration, /ALTER TABLE "farm"\."farm_holdings" FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /CREATE POLICY "farm_holdings_tenant_isolation"/);
  assert.match(migration, /CREATE UNIQUE INDEX "farm_holdings_organization_code_unique"/);
  assert.match(migration, /REVOKE UPDATE, DELETE ON TABLE "farm"\."audit_events"/);
});

test("field migration enforces stable codes, valid areas and tenant isolation", () => {
  const migration = readFileSync(resolve("migrations/0002_fields.sql"), "utf8");
  assert.match(migration, /CREATE UNIQUE INDEX "fields_organization_code_unique"/);
  assert.match(migration, /"code" <> '0MIX'/);
  assert.match(migration, /"usable_area_ha" <= "farm"\."fields"\."total_area_ha"/);
  assert.match(migration, /ALTER TABLE "farm"\."fields" FORCE ROW LEVEL SECURITY/);
});

test("production bootstrap resets only the explicitly pinned empty farm database", () => {
  const bootstrap = readFileSync(resolve("script/bootstrap-production-database.ts"), "utf8");
  assert.match(bootstrap, /Type RESET \$\{bootstrapTarget\.database\}/);
  assert.match(bootstrap, /DROP DATABASE IF EXISTS .*\$\{bootstrapTarget\.database\}.*WITH \(FORCE\)/);
  assert.match(bootstrap, /must be created in DigitalOcean before running the bootstrap/);
  assert.doesNotMatch(bootstrap, /gero_(?:core|grid|hydro)/);
});
