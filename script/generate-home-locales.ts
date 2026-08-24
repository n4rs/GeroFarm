import { writeFile } from "node:fs/promises";
import { en, ptPT, supportedLocales, type HomepageCopy, type SupportedLocale } from "../client/src/home-copy";

const languageTargets: Record<Exclude<SupportedLocale, "en" | "pt-PT">, string> = {
  "pt-BR": "pt", fr: "fr", es: "es", nl: "nl", de: "de", ja: "ja", he: "iw", tr: "tr", ar: "ar", pl: "pl", hr: "hr", el: "el", sv: "sv", no: "no", da: "da", it: "it", uk: "uk", ro: "ro", fi: "fi", bg: "bg", hu: "hu", is: "is", sk: "sk", lt: "lt", sl: "sl", lv: "lv",
};

type Leaf = { path: Array<string | number>; value: string };

function leaves(value: unknown, path: Array<string | number> = []): Leaf[] {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, [...path, index]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => leaves(item, [...path, key]));
  return [];
}

function setAt(target: Record<string, unknown>, path: Array<string | number>, value: string) {
  let cursor: unknown = target;
  for (let index = 0; index < path.length - 1; index += 1) cursor = (cursor as Record<string | number, unknown>)[path[index]];
  (cursor as Record<string | number, unknown>)[path.at(-1)!] = value;
}

const protectedTerms = ["GeroFarm", "GeroGrid", "Gero", "KML", "KMZ", "ET₀", "DLI", "Cookies", "Custom", "Grow", "Professional", "Free"];
function disambiguateSource(text: string) {
  return text
    .replaceAll("Field agriculture", "Open-field agriculture")
    .replaceAll("field agriculture", "open-field agriculture")
    .replaceAll("Field record", "Agricultural field logbook")
    .replaceAll("field record", "agricultural field logbook")
    .replace(/\bFields\b/g, "Agricultural parcels")
    .replace(/\bfields\b/g, "agricultural parcels")
    .replace(/\bField\b/g, "Agricultural parcel")
    .replace(/\bfield\b/g, "agricultural parcel")
    .replace(/\bCrops\b/g, "Cultivated crops")
    .replace(/\bcrops\b/g, "cultivated crops")
    .replace(/\bCrop\b/g, "Cultivation")
    .replace(/\bcrop\b/g, "cultivation")
    .replace(/\bFarm\b/g, "Agricultural holding")
    .replace(/\bfarm\b/g, "agricultural holding");
}
function protect(text: string) {
  let value = text;
  const replacements: string[] = [];
  for (const term of protectedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    value = value.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"), () => { replacements.push(term); return `ZXQTERM${replacements.length - 1}QXZ`; });
  }
  return { value, replacements };
}

function restore(text: string, replacements: string[]) {
  return replacements.reduce((value, term, index) => value.replaceAll(`ZXQTERM${index}QXZ`, term), text)
    .replaceAll("ET0", "ET₀").replaceAll("ET ₀", "ET₀");
}

async function translateText(text: string, target: string, attempt = 0): Promise<string> {
  const { value, replacements } = protect(text);
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  const body = new URLSearchParams({ client: "gtx", sl: "en", tl: target, dt: "t", q: value });
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }, body, signal: AbortSignal.timeout(40_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as Array<Array<Array<string>>>;
    const translated = data[0].map((segment) => segment[0]).join("");
    return restore(translated, replacements);
  } catch (error) {
    if (attempt >= 6) throw error;
    await new Promise((resolve) => setTimeout(resolve, 3_000 * 2 ** attempt));
    return translateText(text, target, attempt + 1);
  }
}

async function translateBatch(items: Leaf[], target: string) {
  const payload = items.map((item, index) => `ZXQSEG${index}QXZ\n${disambiguateSource(item.value)}`).join("\n");
  const translated = await translateText(payload, target);
  const markers = [...translated.matchAll(/ZXQSEG(\d+)QXZ\s*/g)];
  if (markers.length !== items.length) throw new Error(`Translation segment mismatch: expected ${items.length}, received ${markers.length}`);
  return markers.map((marker, index) => translated.slice(marker.index! + marker[0].length, markers[index + 1]?.index ?? translated.length).trim());
}

async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) { const index = cursor; cursor += 1; results[index] = await task(items[index]); }
  }));
  return results;
}

async function translateLocale(locale: Exclude<SupportedLocale, "en" | "pt-PT">) {
  const source = structuredClone(en) as HomepageCopy;
  const sourceLeaves = leaves(source);
  const translated = await translateBatch(sourceLeaves, languageTargets[locale]);
  translated.forEach((value, index) => setAt(source as unknown as Record<string, unknown>, sourceLeaves[index].path, value));
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  return source;
}

const generated: Partial<Record<SupportedLocale, HomepageCopy>> = { en, "pt-PT": ptPT };
for (const locale of supportedLocales) {
  if (locale === "en" || locale === "pt-PT") continue;
  process.stdout.write(`Translating ${locale}...\n`);
  generated[locale] = await translateLocale(locale);
}

const ptBR = generated["pt-BR"]!;
ptBR.metaTitle = "Software de gestão agrícola de campo | GeroFarm";
ptBR.metaDescription = "Mapeie talhões, conecte plantios, operações, colheitas e meteorologia agronômica e mantenha um caderno de campo claro com o GeroFarm.";
Object.assign(ptBR.hero, { eyebrow: "Gestão completa no campo", title: "Gerencie cada plantio,", accent: "do mapa à colheita.", description: "Mapeie talhões, acompanhe plantios e registre operações, irrigação, fertilização, colheitas, lotes, equipes e equipamentos em uma única aplicação.", imageAlt: "Campos agrícolas com limites de talhões mapeados e pontos de observação agronômica", mapLabel: "Talhões mapeados", cropLabel: "Plantios ativos", operationLabel: "Operações registradas" });
ptBR.proof = ["Mapa e KML/KMZ", "Operações agrícolas completas", "Meteorologia por plantio", "Caderno de campo e rastreabilidade"];
ptBR.flow.stages = ["Talhão", "Plantio", "Operação", "Colheita", "Caderno de campo"];
ptBR.platform.description = "Estruture a fazenda, registre o que aconteceu e recupere o contexto de que sua equipe precisa.";
ptBR.modules.costsDesc = "Mão de obra, equipamentos, insumos e outros recursos projetados nos custos do plantio e da colheita sem dupla contabilização.";
ptBR.pricing.description = "Nenhum plano limita operações, colheitas ou cadernos de campo. Todos os planos pagos permitem integrações futuras, incluindo o GeroGrid quando estiver disponível.";
ptBR.pricing.plans[0].features[2] = "5 talhões ativos";
ptBR.pricing.plans[1].features[2] = "50 talhões";
ptBR.pricing.plans[2].features[2] = "250 talhões";
ptBR.pricing.plans[3].features[1] = "Talhões e estações sob medida";
ptBR.footer.tagline = "Gestão agrícola clara, do mapa ao caderno de campo.";
ptBR.footer.cookies = "Cookies";

generated.el!.modules.description = "Το Απόθεμα και το Κόστος είναι προαιρετικές ενότητες στα Grow και Custom και περιλαμβάνονται στο Professional.";
generated.sv!.flow.stages[2] = "Åtgärd";
generated.fi!.modules.description = "Varasto ja Kustannukset ovat valinnaisia moduuleja Grow- ja Custom-paketeissa ja sisältyvät Professional-pakettiin.";
generated.hu!.modules.description = "A Készlet és a Költségek opcionális modulok a Grow és Custom csomagban, a Professional csomag pedig tartalmazza őket.";
generated.is!.flow.stages[0] = "Spilda";

const output = `// Generated by script/generate-home-locales.ts from the reviewed English and Portuguese source.\n// Do not edit by hand; regenerate and review the audit tests.\nimport type { HomepageCopy, SupportedLocale } from "./home-copy";\n\nexport const homepageCopies = ${JSON.stringify(generated, null, 2)} as const satisfies Record<SupportedLocale, HomepageCopy>;\n`;
await writeFile(new URL("../client/src/home-locales.generated.ts", import.meta.url), output, "utf8");
