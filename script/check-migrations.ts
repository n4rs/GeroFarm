import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const journalSchema = z.object({
  version: z.literal("7"),
  dialect: z.literal("postgresql"),
  entries: z.array(z.object({
    idx: z.number().int().nonnegative(),
    version: z.literal("7"),
    tag: z.string().regex(/^\d{4}_[a-z0-9_]+$/),
    breakpoints: z.literal(true),
  })),
});

const migrationsDirectory = resolve("migrations");
const journal = journalSchema.parse(
  JSON.parse(await readFile(resolve(migrationsDirectory, "meta/_journal.json"), "utf8")),
);
const expectedFiles = journal.entries.map((entry, index) => {
  if (entry.idx !== index) throw new Error(`Migration journal index ${entry.idx} is out of sequence.`);
  return `${entry.tag}.sql`;
});
const actualFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (JSON.stringify(actualFiles) !== JSON.stringify([...expectedFiles].sort())) {
  throw new Error("Migration SQL files and the Drizzle journal do not match.");
}
let combinedSql = "";
for (const file of expectedFiles) {
  const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
  if (!sql.trim()) throw new Error(`Migration ${file} is empty.`);
  if (!sql.includes("--> statement-breakpoint")) {
    throw new Error(`Migration ${file} has no statement breakpoints.`);
  }
  combinedSql += `\n${sql}`;
}

const schemaSource = await readFile(resolve("shared/schema.ts"), "utf8");
const declaredTables = [...schemaSource.matchAll(/farmSchema\.table\("([a-z0-9_]+)"/g)].map((match) => match[1]).sort();
const migratedTables = [...combinedSql.matchAll(/CREATE TABLE "farm"\."([a-z0-9_]+)"/g)].map((match) => match[1]).sort();
if (JSON.stringify([...new Set(declaredTables)]) !== JSON.stringify([...new Set(migratedTables)])) {
  throw new Error("Drizzle farm tables and migration-created tables do not match.");
}
for (const table of migratedTables) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`ALTER TABLE "farm"\\."${escaped}" ENABLE ROW LEVEL SECURITY`).test(combinedSql)) throw new Error(`Migration history does not enable RLS for farm.${table}.`);
  if (!new RegExp(`ALTER TABLE "farm"\\."${escaped}" FORCE ROW LEVEL SECURITY`).test(combinedSql)) throw new Error(`Migration history does not force RLS for farm.${table}.`);
}

console.log(`Validated ${expectedFiles.length} PostgreSQL migration(s).`);
