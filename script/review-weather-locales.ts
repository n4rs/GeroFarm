import { supportedLocales } from "../client/src/home-copy";
import { weatherCopies } from "../client/src/app/weather/weather-locales.generated";

const keys = Object.keys(weatherCopies.en);
const allowedTechnical = new Set(["et0", "par", "dli", "utah", "dynamicChill"]);
const englishFallback =
  /\b(active stations|archived stations|effective station limit|time zone|station provenance|effective from|agronomic indicators|degree-day|leaf wetness|accumulation window|campaign start|read-only commercial mode|method and inputs)\b/iu;
for (const locale of supportedLocales) {
  const copy = weatherCopies[locale];
  if (Object.keys(copy).length !== keys.length)
    throw new Error(`${locale}: weather key parity failed`);
  for (const [key, value] of Object.entries(copy)) {
    if (!value.trim()) throw new Error(`${locale}.${key}: empty translation`);
    if (
      locale !== "en" &&
      !allowedTechnical.has(key) &&
      englishFallback.test(value)
    )
      throw new Error(`${locale}.${key}: visible English fallback: ${value}`);
  }
}

const pt = weatherCopies["pt-PT"];
if (
  pt.observed !== "Realizado" ||
  pt.forecast !== "Previsto" ||
  pt.measured !== "Medido" ||
  pt.estimated !== "Estimado"
)
  throw new Error("pt-PT: temporal/source semantics regressed");
if (
  !/graus-dia/iu.test(pt.degreeDays) ||
  !/molhamento foliar/iu.test(pt.leafWetness) ||
  !/ciclo vegetativo/iu.test(pt.vegetativeWarning)
)
  throw new Error("pt-PT: agronomic weather terminology regressed");
if (
  Object.values(weatherCopies).some((copy) =>
    /Gero Core/u.test(copy.description),
  )
)
  throw new Error(
    "Internal platform name leaked into user-facing weather description",
  );
console.log(
  `Reviewed ${keys.length} weather terms in ${supportedLocales.length} locales.`,
);
