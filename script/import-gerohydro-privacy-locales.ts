import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { supportedLocales } from "../client/src/home-copy";

const source = process.argv[2] || "C:/Users/hugoa/Documents/GitHub/GeroHydro/client/src/i18n/locales/privacy";
const profileSource = resolve(source, "../profile");
const result: Record<string, Record<string, string>> = {};
for (const locale of supportedLocales) { const module = await import(pathToFileURL(resolve(source, `${locale}.ts`)).href); const profileModule = await import(pathToFileURL(resolve(profileSource, `${locale}.ts`)).href); const copy = Object.values(module)[0] as Record<string, string>; const profile = Object.values(profileModule)[0] as Record<string, string>; result[locale] = { ...copy, "profile.privacy.requestData": profile["profile.privacy.requestData"], "profile.privacy.requestRectification": profile["profile.privacy.requestRectification"], "profile.privacy.requestErasure": profile["profile.privacy.requestErasure"], "profile.privacy.requestSubmitted": profile["profile.privacy.requestSubmitted"] }; }
const keys = Object.keys(result.en); for (const locale of supportedLocales) { const missing = keys.filter((key) => !result[locale][key]); if (missing.length) throw new Error(`${locale} is missing ${missing.join(", ")}`); }
const union = keys.map((key) => JSON.stringify(key)).join(" | ");
await writeFile(new URL("../client/src/app/privacy/privacy-locales.generated.ts", import.meta.url), `import type { SupportedLocale } from "../../home-copy";export type PrivacyCopy=Record<${union},string>;export const privacyCopies=${JSON.stringify(result, null, 2)} as const satisfies Record<SupportedLocale,PrivacyCopy>;\n`, "utf8");
