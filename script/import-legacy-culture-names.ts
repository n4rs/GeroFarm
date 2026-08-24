import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Usage: tsx script/import-legacy-culture-names.ts <cultures.rb>");

const ruby = await readFile(resolve(source), "utf8");
const names = [...ruby.matchAll(/\{name:\s*'([^']+)'/g)].map((match) => match[1]);
const uniqueNames = [...new Set(names)];
if (names.length !== 107 || uniqueNames.length !== 106) {
  throw new Error(`Expected 107 source records and 106 unique names; found ${names.length} and ${uniqueNames.length}`);
}

const rows = uniqueNames.map((sourceName, index) => ({
  id: `pt-drap-${String(index + 1).padStart(3, "0")}`,
  sourceName,
}));
const output = `// Generated from the legacy GeroCampo culture seed. The source contained 107 rows; the duplicate Alfarrobeira was removed.\n// Only names are carried forward. Legacy fertilisation figures are intentionally excluded.\nexport const legacyCultureNames = ${JSON.stringify(rows, null, 2)} as const;\n`;
await writeFile(resolve("shared/culture-catalog.generated.ts"), output, "utf8");
console.log(`Imported ${rows.length} unique culture names.`);
