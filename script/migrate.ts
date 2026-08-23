import "../server/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "../server/database";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) {
  throw new Error("DATABASE_MIGRATION_URL is required; migrations never use DATABASE_URL implicitly");
}

const { db, pool } = createDatabase(migrationUrl);
try {
  await migrate(db, { migrationsFolder: "migrations" });
  console.log("GeroFarm database migrations completed");
} finally {
  await pool.end();
}
