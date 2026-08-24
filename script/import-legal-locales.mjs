import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

if (!process.argv[2]) throw new Error("Pass the GeroHydro client/src/i18n/locales directory as the first argument.");
const sourceRoot = resolve(process.argv[2]);
const targetRoot = resolve("client/src/legal-locales");
const groups = ["legal", "cookies"];

rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(targetRoot, { recursive: true });

for (const group of groups) {
  const source = join(sourceRoot, group);
  const target = join(targetRoot, group);
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source).filter((name) => name.endsWith(".ts"))) {
    const destination = join(target, basename(file));
    cpSync(join(source, file), destination);
    const adapted = readFileSync(destination, "utf8")
      .replaceAll("GeroHydro", "GeroFarm")
      .replaceAll("gerohydro", "gerofarm")
      .trimEnd() + "\n";
    writeFileSync(destination, adapted);
  }
}

const locales = readdirSync(join(targetRoot, "legal")).filter((name) => name.endsWith(".ts")).map((name) => name.slice(0, -3));
const imports = [];
const cookieImports = [];
const entries = [];
const cookieEntries = [];
for (const locale of locales) {
  const legalSource = readFileSync(join(targetRoot, "legal", `${locale}.ts`), "utf8");
  const cookieSource = readFileSync(join(targetRoot, "cookies", `${locale}.ts`), "utf8");
  const legalName = legalSource.match(/export const (\w+)/)?.[1];
  const cookieName = cookieSource.match(/export const (\w+)/)?.[1];
  if (!legalName || !cookieName) throw new Error(`Could not find locale exports for ${locale}`);
  imports.push(`import { ${legalName} } from "./legal/${locale}";`, `import { ${cookieName} } from "./cookies/${locale}";`);
  entries.push(`  ${JSON.stringify(locale)}: { ...${legalName}, ...${cookieName} },`);
  cookieImports.push(`import { ${cookieName} } from "./cookies/${locale}";`);
  cookieEntries.push(`  ${JSON.stringify(locale)}: ${cookieName},`);
}
writeFileSync(join(targetRoot, "index.ts"), `${imports.join("\n")}\n\nexport const legalMessages = {\n${entries.join("\n")}\n} as const;\n`);
writeFileSync(join(targetRoot, "cookies-index.ts"), `${cookieImports.join("\n")}\n\nexport const cookieMessages = {\n${cookieEntries.join("\n")}\n} as const;\n`);

console.log(`Imported and adapted ${groups.join(" and ")} locales into ${targetRoot}`);
