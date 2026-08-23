import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import {
  bootstrapTarget,
  validateBootstrapConnections,
  type BootstrapConnections,
} from "../server/database-bootstrap";
import { databasePoolConfig } from "../server/database";

function caFileFromArguments(arguments_: string[]): string {
  const index = arguments_.indexOf("--ca-file");
  const path = index >= 0 ? arguments_[index + 1]?.trim() : "";
  if (!path || arguments_.length !== 2) {
    throw new Error("Usage: npm run db:bootstrap-production -- --ca-file <certificate.crt>");
  }
  return resolve(path);
}

async function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("An interactive terminal is required to enter database credentials.");
  }
  stdout.write(prompt);
  stdin.setEncoding("utf8");
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolveSecret, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolveSecret(value.trim());
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Bootstrap cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\b" || character === "\u007f") value = value.slice(0, -1);
        else if (character >= " ") value += character;
      }
    };
    stdin.on("data", onData);
  });
}

async function confirmReset(): Promise<void> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await readline.question(
      `Type RESET ${bootstrapTarget.database} to recreate the empty GeroFarm database: `,
    );
    if (answer.trim() !== `RESET ${bootstrapTarget.database}`) {
      throw new Error("Bootstrap cancelled: confirmation did not match.");
    }
  } finally {
    readline.close();
  }
}

async function preflight(adminPool: pg.Pool): Promise<void> {
  const identity = await adminPool.query<{ current_database: string; current_user: string }>(
    "SELECT current_database(), current_user",
  );
  const current = identity.rows[0];
  if (current?.current_database !== bootstrapTarget.adminDatabase || current.current_user !== bootstrapTarget.adminUser) {
    throw new Error("The live admin connection does not match the validated target.");
  }
  const roles = await adminPool.query<{ rolname: string }>(
    "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname",
    [[bootstrapTarget.migratorUser, bootstrapTarget.runtimeUser]],
  );
  const found = new Set(roles.rows.map((row) => row.rolname));
  for (const role of [bootstrapTarget.migratorUser, bootstrapTarget.runtimeUser]) {
    if (!found.has(role)) throw new Error(`Required database role ${role} does not exist.`);
  }
  const database = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [bootstrapTarget.database]);
  if (!database.rowCount) {
    throw new Error(`${bootstrapTarget.database} must be created in DigitalOcean before running the bootstrap.`);
  }
  console.log("Preflight passed for the isolated gero_farm database and roles.");
}

async function ensureTemporaryAdminMembership(adminPool: pg.Pool): Promise<boolean> {
  const result = await adminPool.query<{
    canCreateDatabase: boolean;
    canCreateRole: boolean;
    isMigratorMember: boolean;
  }>(`
    SELECT rolcreatedb AS "canCreateDatabase", rolcreaterole AS "canCreateRole",
      pg_has_role(current_user, '${bootstrapTarget.migratorUser}', 'MEMBER') AS "isMigratorMember"
    FROM pg_roles WHERE rolname = current_user
  `);
  const capability = result.rows[0];
  if (!capability?.canCreateDatabase) throw new Error(`${bootstrapTarget.adminUser} cannot create the target database.`);
  if (capability.isMigratorMember) return false;
  if (!capability.canCreateRole) throw new Error(`${bootstrapTarget.adminUser} cannot assume the migrator owner role.`);
  await adminPool.query(`GRANT "${bootstrapTarget.migratorUser}" TO "${bootstrapTarget.adminUser}"`);
  return true;
}

async function recreateDatabase(adminPool: pg.Pool): Promise<void> {
  await adminPool.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [bootstrapTarget.database],
  );
  await adminPool.query(`DROP DATABASE IF EXISTS "${bootstrapTarget.database}" WITH (FORCE)`);
  await adminPool.query(
    `CREATE DATABASE "${bootstrapTarget.database}" OWNER "${bootstrapTarget.migratorUser}"`,
  );
  console.log("Recreated gero_farm with the dedicated migrator as owner.");
}

async function establishRoleBoundary(migratorPool: pg.Pool): Promise<void> {
  const client = await migratorPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`REVOKE ALL ON DATABASE "${bootstrapTarget.database}" FROM PUBLIC`);
    await client.query(
      `GRANT CONNECT, CREATE, TEMPORARY ON DATABASE "${bootstrapTarget.database}" TO "${bootstrapTarget.migratorUser}"`,
    );
    await client.query(
      `GRANT CONNECT ON DATABASE "${bootstrapTarget.database}" TO "${bootstrapTarget.runtimeUser}"`,
    );
    await client.query(`ALTER SCHEMA "public" OWNER TO "${bootstrapTarget.migratorUser}"`);
    await client.query('REVOKE ALL ON SCHEMA "public" FROM PUBLIC');
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyBoundary(migratorPool: pg.Pool): Promise<void> {
  const result = await migratorPool.query<{
    databaseOwner: string;
    farmSchemaOwner: string;
    migrationHistoryVisible: boolean;
    runtimeCanConnect: boolean;
    runtimeCanCreateDatabaseObjects: boolean;
    runtimeCanCreateFarmObjects: boolean;
    runtimeCanMutateOrganizations: boolean;
    runtimeCanUseFarm: boolean;
    unexpectedTableOwners: number;
  }>(`
    SELECT
      pg_get_userbyid((SELECT datdba FROM pg_database WHERE datname = current_database())) AS "databaseOwner",
      pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname = 'farm')) AS "farmSchemaOwner",
      (SELECT count(*)::integer FROM pg_tables WHERE schemaname IN ('farm', 'drizzle') AND tableowner <> '${bootstrapTarget.migratorUser}') AS "unexpectedTableOwners",
      has_database_privilege('${bootstrapTarget.runtimeUser}', current_database(), 'CONNECT') AS "runtimeCanConnect",
      has_database_privilege('${bootstrapTarget.runtimeUser}', current_database(), 'CREATE') AS "runtimeCanCreateDatabaseObjects",
      has_schema_privilege('${bootstrapTarget.runtimeUser}', 'farm', 'USAGE') AS "runtimeCanUseFarm",
      has_schema_privilege('${bootstrapTarget.runtimeUser}', 'farm', 'CREATE') AS "runtimeCanCreateFarmObjects",
      has_table_privilege('${bootstrapTarget.runtimeUser}', 'farm.organizations', 'SELECT,INSERT,UPDATE,DELETE') AS "runtimeCanMutateOrganizations",
      has_table_privilege('${bootstrapTarget.runtimeUser}', 'drizzle.__drizzle_migrations', 'SELECT') AS "migrationHistoryVisible"
  `);
  const verification = result.rows[0];
  if (
    !verification || verification.databaseOwner !== bootstrapTarget.migratorUser ||
    verification.farmSchemaOwner !== bootstrapTarget.migratorUser || verification.unexpectedTableOwners !== 0 ||
    !verification.runtimeCanConnect || verification.runtimeCanCreateDatabaseObjects ||
    !verification.runtimeCanUseFarm || verification.runtimeCanCreateFarmObjects ||
    !verification.runtimeCanMutateOrganizations || verification.migrationHistoryVisible
  ) {
    throw new Error("Post-migration ownership or privilege verification failed.");
  }
  console.log("Verified migrator ownership and least-privilege runtime access.");
}

function redact(error: unknown, secrets: string[]): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) if (secret) message = message.replaceAll(secret, "[redacted]");
  return message;
}

async function main(): Promise<void> {
  const certificate = (await readFile(caFileFromArguments(process.argv.slice(2)), "utf8")).trim();
  if (!certificate.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("The CA file does not contain a PEM certificate.");
  }
  let connections: BootstrapConnections = {
    adminUrl: await readHidden("Admin connection string (hidden): "),
    migratorUrl: await readHidden("Migrator connection string (hidden): "),
  };
  const secrets = [connections.adminUrl, connections.migratorUrl];
  try {
    validateBootstrapConnections(connections);
    const adminPool = new pg.Pool(databasePoolConfig(connections.adminUrl, certificate));
    let temporaryMembership = false;
    try {
      await preflight(adminPool);
      await confirmReset();
      temporaryMembership = await ensureTemporaryAdminMembership(adminPool);
      await recreateDatabase(adminPool);
    } finally {
      try {
        if (temporaryMembership) {
          await adminPool.query(`REVOKE "${bootstrapTarget.migratorUser}" FROM "${bootstrapTarget.adminUser}"`);
        }
      } finally {
        await adminPool.end();
      }
    }
    const migratorPool = new pg.Pool(databasePoolConfig(connections.migratorUrl, certificate));
    try {
      await establishRoleBoundary(migratorPool);
      await migrate(drizzle(migratorPool), { migrationsFolder: resolve("migrations") });
      await verifyBoundary(migratorPool);
    } finally {
      await migratorPool.end();
    }
    console.log("GeroFarm production database bootstrap completed successfully.");
  } catch (error) {
    throw new Error(redact(error, secrets));
  } finally {
    connections = { adminUrl: "", migratorUrl: "" };
    secrets.fill("");
  }
}

main().catch((error) => {
  console.error(`Bootstrap failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
