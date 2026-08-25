import { supportedLocales } from "../client/src/home-copy";
import { workspaceCopies, workspaceStateCopies } from "../client/src/app/workspace-locales";
import { farmHoldingCopies } from "../client/src/app/farm/farm-holding-locales";
import { fieldCopies } from "../client/src/app/farm/field-locales";
import { cropCopies } from "../client/src/app/crops/crop-locales.generated";
import { lifecycleCopies } from "../client/src/app/crops/lifecycle-locales.generated";
import { resourceCopies } from "../client/src/app/resources/resource-locales.generated";
import { operationCopies } from "../client/src/app/operations/operation-locales.generated";
import { economicCopies } from "../client/src/app/economics/economic-locales";
import { settingsCopies } from "../client/src/app/settings/settings-locales";
import { monitoringWeatherCopies } from "../client/src/app/agronomy/monitoring-weather-locales";
import { operationExtensionCopies } from "../client/src/app/operations/operation-extension-locales";
import { entitlementCopies } from "../client/src/app/entitlements/entitlement-locales";
import { agronomyCopies } from "../client/src/app/agronomy/agronomy-locales";
import { irrigationCopies } from "../client/src/app/operations/irrigation-locales";
import { planCopies } from "../client/src/app/plans/plan-locales.generated";
import { sprayingCopies } from "../client/src/app/operations/spraying-locales.generated";
import { weatherCopies } from "../client/src/app/weather/weather-locales.generated";

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

const moduleCatalogues = { farmHoldings: farmHoldingCopies, fields: fieldCopies, crops: cropCopies, lifecycle: lifecycleCopies, resources: resourceCopies, operations: operationCopies, operationExtensions: operationExtensionCopies, economics: economicCopies, settings: settingsCopies, monitoringWeather: monitoringWeatherCopies, entitlements: entitlementCopies, agronomy: agronomyCopies, irrigation: irrigationCopies, plans: planCopies, spraying: sprayingCopies, weather: weatherCopies };
for (const [catalogueName, catalogue] of Object.entries(moduleCatalogues)) {
  const messages = catalogue as unknown as Record<string, Record<string, string>>;
  const keys = Object.keys(messages.en).sort();
  for (const locale of supportedLocales) {
    if (JSON.stringify(Object.keys(messages[locale]).sort()) !== JSON.stringify(keys)) findings.push(`${catalogueName}.${locale}: key mismatch`);
    for (const key of keys) {
      const value = messages[locale][key];
      if (typeof value === "string") {
        if (!value.trim()) findings.push(`${catalogueName}.${locale}.${key}: blank value`);
        if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(messages.en[key]))) findings.push(`${catalogueName}.${locale}.${key}: placeholder mismatch`);
        if (locale !== "en" && value === messages.en[key] && value.length >= 18) findings.push(`${catalogueName}.${locale}.${key}: untranslated English sentence`);
      }
    }
  }
}

if (findings.length) throw new Error(`Application locale review failed:\n${findings.join("\n")}`);
console.log(`Reviewed ${supportedLocales.length} application locales across ${1 + Object.keys(moduleCatalogues).length} catalogues.`);
