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
