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
for (const file of expectedFiles) {
  const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
  if (!sql.trim()) throw new Error(`Migration ${file} is empty.`);
  if (!sql.includes("--> statement-breakpoint")) {
    throw new Error(`Migration ${file} has no statement breakpoints.`);
  }
}

console.log(`Validated ${expectedFiles.length} PostgreSQL migration(s).`);
