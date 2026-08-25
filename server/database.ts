import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { z } from "zod";
import * as schema from "@shared/schema";

const organizationIdSchema = z.string().uuid();
const tlsQueryParameters = ["sslmode", "sslcert", "sslkey", "sslrootcert"];

export type FarmDatabase = NodePgDatabase<typeof schema>;
export type FarmTransaction = Parameters<Parameters<FarmDatabase["transaction"]>[0]>[0];

export function databasePoolConfig(
  databaseUrl: string,
  certificate = process.env.DATABASE_CA_CERT?.trim(),
): PoolConfig {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }
  if (certificate) {
    for (const parameter of tlsQueryParameters) parsed.searchParams.delete(parameter);
  }
  return {
    connectionString: certificate ? parsed.toString() : databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...(certificate ? {
      ssl: {
        ca: certificate.replace(/\\n/g, "\n"),
        rejectUnauthorized: true,
      },
    } : {}),
  };
}

export function createDatabase(databaseUrl = process.env.DATABASE_URL): { db: FarmDatabase; pool: Pool } {
  if (!databaseUrl) throw new Error("DATABASE_URL is required when product persistence is enabled");
  const pool = new Pool(databasePoolConfig(databaseUrl));
  return { db: drizzle(pool, { schema }), pool };
}

export async function withOrganizationTransaction<T>(
  db: FarmDatabase,
  organizationId: string,
  operation: (transaction: FarmTransaction) => Promise<T>,
  config?: Parameters<FarmDatabase["transaction"]>[1],
): Promise<T> {
  const validatedOrganizationId = organizationIdSchema.parse(organizationId);
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select set_config('app.organization_id', ${validatedOrganizationId}, true)`);
    return operation(transaction);
  }, config);
}
