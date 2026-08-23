import assert from "node:assert/strict";
import test from "node:test";
import { databasePoolConfig, withOrganizationTransaction } from "./database";

test("builds a bounded PostgreSQL pool for product persistence", () => {
  const url = "postgresql://farm:secret@localhost:5432/gero_farm";
  assert.deepEqual(databasePoolConfig(url, ""), {
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
});

test("rejects non-PostgreSQL persistence URLs", () => {
  assert.throws(() => databasePoolConfig("mysql://localhost/gero_farm", ""), /PostgreSQL protocol/);
});

test("uses the managed database CA with strict certificate validation", () => {
  const config = databasePoolConfig(
    "postgresql://farm:secret@db.example.test:25060/gero_farm?sslmode=require",
    "-----BEGIN CERTIFICATE-----\\ncertificate\\n-----END CERTIFICATE-----",
  );
  assert.equal(config.connectionString, "postgresql://farm:secret@db.example.test:25060/gero_farm");
  assert.deepEqual(config.ssl, {
    ca: "-----BEGIN CERTIFICATE-----\ncertificate\n-----END CERTIFICATE-----",
    rejectUnauthorized: true,
  });
});

test("rejects an invalid tenant before opening a transaction", async () => {
  const fakeDatabase = {
    transaction: () => { throw new Error("transaction must not start"); },
  };
  await assert.rejects(
    withOrganizationTransaction(fakeDatabase as never, "not-a-uuid", async () => undefined),
    /Invalid uuid/i,
  );
});
