import { supportedLocales } from "../client/src/home-copy";
import { workspaceCopies, workspaceStateCopies } from "../client/src/app/workspace-locales";

function placeholders(value: string) { return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(); }

const referenceKeys = Object.keys(workspaceCopies.en).sort();
const stateKeys = Object.keys(workspaceStateCopies.en).sort();
const findings: string[] = [];

for (const locale of supportedLocales) {
  const messages = workspaceCopies[locale];
  if (JSON.stringify(Object.keys(messages).sort()) !== JSON.stringify(referenceKeys)) findings.push(`${locale}: workspace key mismatch`);
  if (JSON.stringify(Object.keys(workspaceStateCopies[locale]).sort()) !== JSON.stringify(stateKeys)) findings.push(`${locale}: state key mismatch`);
  for (const key of referenceKeys) {
    const value = messages[key as keyof typeof messages];
    const expected = placeholders(workspaceCopies.en[key as keyof typeof messages]);
    if (!value.trim()) findings.push(`${locale}.${key}: blank value`);
    if (JSON.stringify(placeholders(value)) !== JSON.stringify(expected)) findings.push(`${locale}.${key}: placeholder mismatch`);
    if (locale !== "en" && value === workspaceCopies.en[key as keyof typeof messages] && value.length >= 18) findings.push(`${locale}.${key}: untranslated English sentence`);
  }
}

if (findings.length) throw new Error(`Application locale review failed:\n${findings.join("\n")}`);
console.log(`Reviewed ${supportedLocales.length} application locales with key, placeholder and untranslated-sentence checks.`);
