import "../server/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../server/database";
import { bootstrapTarget } from "../server/database-bootstrap";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) {
  throw new Error("DATABASE_MIGRATION_URL is required; migrations never use DATABASE_URL implicitly");
}

const { db, pool } = createDatabase(migrationUrl);
try {
  const identity = await pool.query<{ current_database: string; current_user: string }>("SELECT current_database(), current_user");
  if (identity.rows[0]?.current_database !== bootstrapTarget.database || identity.rows[0]?.current_user !== bootstrapTarget.migratorUser) {
    throw new Error(`Migration connection must target ${bootstrapTarget.database} as ${bootstrapTarget.migratorUser}`);
  }
  await migrate(db, { migrationsFolder: "migrations" });
  console.log("GeroFarm database migrations completed");
} finally {
  await pool.end();
}
