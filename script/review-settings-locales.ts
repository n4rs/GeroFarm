import { supportedLocales } from "../shared/locales";
import { settingsCopies } from "../client/src/app/settings/settings-locales";

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");
const keys = Object.keys(settingsCopies.en).sort();
const critical = ["subtitle", "centralNotice", "manageProfile", "manageSecurity", "languageDescription", "saveLanguage", "saveError"] as const;
const findings: string[] = [];

for (const locale of supportedLocales) {
  const copy = settingsCopies[locale];
  if (JSON.stringify(Object.keys(copy).sort()) !== JSON.stringify(keys)) findings.push(`${locale}: key mismatch`);
  for (const key of keys) {
    const value = copy[key as keyof typeof copy];
    if (!value.trim()) findings.push(`${locale}.${key}: blank`);
    if (placeholders(value) !== placeholders(settingsCopies.en[key as keyof typeof copy])) findings.push(`${locale}.${key}: placeholder mismatch`);
  }
  if (locale !== "en") for (const key of critical) if (copy[key] === settingsCopies.en[key]) findings.push(`${locale}.${key}: English fallback`);
}

const joined = Object.values(settingsCopies).flatMap(Object.values).join("\n");
if (/authoritative în|авторитетни|Μονάδες|Ingen abonnement|Slutar \{date\}|Avaa Gero Coren|forblir autoritative|javascript:|undefined|null/iu.test(joined)) findings.push("catalogue contains rejected false friends, agreement errors or implementation leakage");
if (!/Gero Core/u.test(settingsCopies["pt-PT"].centralNotice) || !/ملف/u.test(settingsCopies.ar.languageDescription) || !/אבטחה/u.test(settingsCopies.he.manageSecurity)) findings.push("critical PT/AR/HE terminology mismatch");
if (settingsCopies.ro.centralNotice !== "Contul, organizația, securitatea, abonamentul și permisiunile sunt sursele oficiale în Gero Core." || !/официален източник/u.test(settingsCopies.bg.centralNotice) || settingsCopies.el.modules !== "Ενότητες" || settingsCopies.fi.opensCore !== "Avaa Gero Core -palvelun" || settingsCopies.no.noSubscription !== "Intet abonnement" || settingsCopies.no.expires !== "Utløper {date}" || settingsCopies.sv.expires !== "Upphör {date}" || settingsCopies.da.expires !== "Udløber {date}") findings.push("reviewed RO/BG/EL/FI/NO/SV/DA terminology regressed");
if (findings.length) throw new Error(`Settings locale review failed:\n${findings.join("\n")}`);
console.log(`Reviewed ${supportedLocales.length} settings locales, ${keys.length} keys, placeholders and critical terminology.`);
