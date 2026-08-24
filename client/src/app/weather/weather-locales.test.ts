import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { weatherCopies } from "./weather-locales.generated";

test("agronomic weather UI covers exactly the 28 supported locales",()=>{assert.deepEqual(Object.keys(weatherCopies).sort(),[...supportedLocales].sort());for(const locale of supportedLocales){const copy=weatherCopies[locale];assert(copy.title.length>0);assert(copy.stations.length>0);assert(copy.observed.length>0);assert(copy.estimated.length>0)}});
test("Portuguese weather semantics distinguish temporal status and value source",()=>{const copy=weatherCopies["pt-PT"];assert.equal(copy.observed,"Realizado");assert.equal(copy.forecast,"Previsto");assert.equal(copy.measured,"Medido");assert.equal(copy.estimated,"Estimado");assert.match(copy.vegetativeWarning,/nunca/)});
test("every locale translates long weather guidance without an English fallback",()=>{const english=weatherCopies.en;for(const locale of supportedLocales){if(locale==="en")continue;const copy=weatherCopies[locale];for(const key of ["readOnly","limitReached","historicalProvenance","vegetativeWarning"] as const)assert.notEqual(copy[key],english[key],`${locale}.${key}`)}});
test("reviewed agronomic terms reject known literal weather mistranslations",()=>{const bad=/Groeilast dagen|ימים? עלייה במעלה|الدرجات الناضجة|Wilgotnościowo-stopniodniowy|Växttillväxtgrader|Vaxandi gráður daga|Augšanas dienas grādi/iu;for(const locale of supportedLocales){assert.doesNotMatch(weatherCopies[locale].degreeDays,bad,locale);assert.doesNotMatch(weatherCopies[locale].leafWetness,bad,locale)}});

test("generated weather catalog has no runtime English spread or fallback", async () => {
  const source = await readFile(
    new URL("./weather-locales.generated.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\.\.\./u);
  assert.doesNotMatch(source, /weatherEnglishCopy/u);
});

test("Core warning detail is never rendered as visible untranslated copy", async () => {
  const source = await readFile(
    new URL("./WeatherModule.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /warning\(item\.code\)/u);
  assert.doesNotMatch(source, /item\.detail/u);
});
