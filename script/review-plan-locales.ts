import { supportedLocales } from "../client/src/home-copy";
import { planEnglishCopy } from "../client/src/app/plans/plan-copy-source";
import { planCopies } from "../client/src/app/plans/plan-locales.generated";

const keys = Object.keys(planEnglishCopy) as Array<keyof typeof planEnglishCopy>;
if (Object.keys(planCopies).length !== supportedLocales.length) throw new Error("Plan locale count differs from homepage locale count.");
for (const locale of supportedLocales) {
  const copy = planCopies[locale];
  if (Object.keys(copy).length !== keys.length || keys.some((key) => !(key in copy))) throw new Error(`${locale}: plan copy parity failed.`);
  for (const key of keys) if (!copy[key]?.trim()) throw new Error(`${locale}.${key}: empty translation.`);
  if (locale !== "en" && ["title","description","addPlan","objectives","plannedSources","delivered","remaining","operationNotice"].filter((key) => copy[key as keyof typeof copy] === planEnglishCopy[key as keyof typeof planEnglishCopy]).length) throw new Error(`${locale}: core plan terminology leaked from English.`);
}
if (!/[\u0590-\u05ff]/.test(planCopies.he.title + planCopies.he.description)) throw new Error("Hebrew plan copy is not written in Hebrew.");
if (!/[\u0600-\u06ff]/.test(planCopies.ar.title + planCopies.ar.description)) throw new Error("Arabic plan copy is not written in Arabic.");
if (planCopies["pt-PT"].title !== "Planos de fertilização" || planCopies["pt-BR"].title !== "Planos de adubação") throw new Error("Portuguese agronomic variants regressed.");
console.log(`Reviewed ${supportedLocales.length} plan locales with ${keys.length} strings each (${supportedLocales.length * keys.length} entries).`);
