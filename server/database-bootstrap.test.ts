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

test("crop lifecycle migration isolates tenants and preserves dated rotation history", () => {
  const migration = readFileSync(resolve("migrations/0004_crop_lifecycle.sql"), "utf8");
  for (const table of ["plantations", "crop_periods", "plantation_uprootings", "field_fallows"]) {
    assert.match(migration, new RegExp(`ALTER TABLE "farm"\\."${table}" FORCE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`CREATE POLICY "${table}_tenant_isolation"`));
  }
  assert.match(migration, /plantations_dates_valid/);
  assert.match(migration, /crop_periods_dates_valid/);
  assert.match(migration, /field_fallows_dates_valid/);
  assert.match(migration, /plantation_uprootings_plantation_unique/);
});

test("resource migration isolates people, certificates, contractors and equipment", () => {
  const migration = readFileSync(resolve("migrations/0005_resources.sql"), "utf8");
  for (const table of ["workers", "worker_certificates", "contractors", "equipment"]) assert.match(migration, new RegExp(`ALTER TABLE "farm"\\."${table}" FORCE ROW LEVEL SECURITY`));
  assert.match(migration, /worker_certificates_dates_valid/);
  assert.match(migration, /equipment_organization_code_unique/);
});

test("operation migration keeps one tenant-scoped physical operation and shared resources",()=>{const migration=readFileSync(resolve("migrations/0006_operations.sql"),"utf8");assert.match(migration,/operation_sequences_organization_year_unique/);assert.match(migration,/operations_organization_code_unique/);for(const table of["operations","operation_workers","operation_equipment","operation_contractors"])assert.match(migration,new RegExp(`FORCE ROW LEVEL SECURITY[^]*${table}_tenant_isolation|${table}_tenant_isolation[^]*FORCE ROW LEVEL SECURITY`));assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operations"/)});
test("operation destinations migrate existing work without duplicating shared resources",()=>{const migration=readFileSync(resolve("migrations/0007_operation_destinations.sql"),"utf8");assert.match(migration,/INSERT INTO "farm"\."operation_destinations"[^]*coalesce\(operation\.area_ha,field\.usable_area_ha\),100/);assert.match(migration,/operation_destinations_tenant_isolation/);assert.match(migration,/FORCE ROW LEVEL SECURITY/);assert.match(migration,/DROP COLUMN "field_id"/);assert.match(migration,/DROP COLUMN "area_ha"/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operation_destinations"/)});
test("Privacy by Design requests are tenant isolated, auditable and cannot be deleted",()=>{const migration=readFileSync(resolve("migrations/0008_privacy_by_design.sql"),"utf8");assert.match(migration,/privacy_requests_tenant_isolation/);assert.match(migration,/FORCE ROW LEVEL SECURITY/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."privacy_requests"/);assert.match(migration,/deadline_at/)});
test("soil preparation details remain attached to one immutable physical operation",()=>{const migration=readFileSync(resolve("migrations/0009_soil_preparation.sql"),"utf8");assert.match(migration,/operation_soil_preparations_tenant_isolation/);assert.match(migration,/FORCE ROW LEVEL SECURITY/);assert.match(migration,/REFERENCES "farm"\."operations"/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operation_soil_preparations"/)});
test("crop installation atomically links the operation to its created plantation",()=>{const migration=readFileSync(resolve("migrations/0010_crop_installation.sql"),"utf8");assert.match(migration,/operation_crop_installations_tenant_isolation/);assert.match(migration,/REFERENCES "farm"\."operations"/);assert.match(migration,/REFERENCES "farm"\."plantations"/);assert.match(migration,/density_plants_ha/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operation_crop_installations"/)});
test("cultural work preserves several actions and specialised replacement data",()=>{const migration=readFileSync(resolve("migrations/0011_cultural_work.sql"),"utf8");assert.match(migration,/operation_cultural_works_tenant_isolation/);assert.match(migration,/jsonb_array_length\("actions"\) > 0/);assert.match(migration,/"replanting" jsonb/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operation_cultural_works"/)});
test("fertilization snapshots products and calculated nutrients on one operation",()=>{const migration=readFileSync(resolve("migrations/0012_fertilization.sql"),"utf8");assert.match(migration,/operation_fertilizations_tenant_isolation/);assert.match(migration,/"products" jsonb NOT NULL/);assert.doesNotMatch(migration,/linked_soil_preparation_operation_id/);assert.match(migration,/REVOKE DELETE ON TABLE "farm"\."operation_fertilizations"/)});

test("production bootstrap resets only the explicitly pinned empty farm database", () => {
  const bootstrap = readFileSync(resolve("script/bootstrap-production-database.ts"), "utf8");
  assert.match(bootstrap, /Type RESET \$\{bootstrapTarget\.database\}/);
  assert.match(bootstrap, /DROP DATABASE IF EXISTS .*\$\{bootstrapTarget\.database\}.*WITH \(FORCE\)/);
  assert.match(bootstrap, /must be created in DigitalOcean before running the bootstrap/);
  assert.doesNotMatch(bootstrap, /gero_(?:core|grid|hydro)/);
});
