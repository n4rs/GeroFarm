import { writeFile } from "node:fs/promises";
import { supportedLocales, type SupportedLocale } from "../client/src/home-copy";

const en = {
  kicker: "Agronomic catalogue", title: "Crops and varieties", description: "Use a stable crop catalogue and maintain the varieties used by the organisation.",
  cultures: "Crops", varieties: "Varieties", search: "Search crops", sourceDesignation: "Portuguese source designation", sourceNotice: "The historical catalogue contains 106 distinct Portuguese source designations. They remain visible as source data and are not silently mistranslated.",
  records: "{count} crops", emptySearch: "No crop matches this search.", addVariety: "New variety", varietyName: "Variety name", crop: "Crop", save: "Save variety", cancel: "Cancel", emptyVarieties: "No varieties have been recorded yet.", loadError: "The crop catalogue could not be loaded.", saveError: "The variety could not be saved.", customValueNotice: "Names entered by the organisation are preserved in their original language.", provenance: "Legacy catalogue provenance", duplicateRemoved: "One duplicate source row was removed.",
};
const ptPT: typeof en = {
  kicker: "Catálogo agronómico", title: "Culturas e variedades", description: "Use um catálogo estável de culturas e mantenha as variedades utilizadas pela organização.",
  cultures: "Culturas", varieties: "Variedades", search: "Pesquisar culturas", sourceDesignation: "Designação portuguesa de origem", sourceNotice: "O catálogo histórico contém 106 designações portuguesas distintas. Permanecem visíveis como dados de origem e não são traduzidas silenciosamente de forma incorreta.",
  records: "{count} culturas", emptySearch: "Nenhuma cultura corresponde a esta pesquisa.", addVariety: "Nova variedade", varietyName: "Nome da variedade", crop: "Cultura", save: "Guardar variedade", cancel: "Cancelar", emptyVarieties: "Ainda não foi registada nenhuma variedade.", loadError: "Não foi possível carregar o catálogo de culturas.", saveError: "Não foi possível guardar a variedade.", customValueNotice: "Os nomes introduzidos pela organização são preservados no idioma original.", provenance: "Proveniência do catálogo legado", duplicateRemoved: "Foi removida uma linha de origem duplicada.",
};
const targets: Record<Exclude<SupportedLocale, "en" | "pt-PT">, string> = { "pt-BR": "pt", fr: "fr", es: "es", nl: "nl", de: "de", ja: "ja", he: "iw", tr: "tr", ar: "ar", pl: "pl", hr: "hr", el: "el", sv: "sv", no: "no", da: "da", it: "it", uk: "uk", ro: "ro", fi: "fi", bg: "bg", hu: "hu", is: "is", sk: "sk", lt: "lt", sl: "sl", lv: "lv" };

async function translate(locale: Exclude<SupportedLocale, "en" | "pt-PT">) {
  const keys = Object.keys(en) as Array<keyof typeof en>;
  const protectedCount = keys.map((key) => en[key].replaceAll("{count}", "ZXQCOUNTQXZ"));
  const payload = protectedCount.map((value, index) => `ZXQSEG${index}QXZ\n${value}`).join("\n");
  const body = new URLSearchParams({ client: "gtx", sl: "en", tl: targets[locale], dt: "t", q: payload });
  const response = await fetch("https://translate.googleapis.com/translate_a/single", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }, body, signal: AbortSignal.timeout(40_000) });
  if (!response.ok) throw new Error(`${locale}: HTTP ${response.status}`);
  const data = await response.json() as Array<Array<Array<string>>>;
  const text = data[0].map((segment) => segment[0]).join("");
  const markers = [...text.matchAll(/ZXQSEG(\d+)QXZ\s*/g)];
  if (markers.length !== keys.length) throw new Error(`${locale}: segment mismatch`);
  return Object.fromEntries(keys.map((key, index) => [key, text.slice(markers[index].index! + markers[index][0].length, markers[index + 1]?.index ?? text.length).trim().replaceAll("ZXQCOUNTQXZ", "{count}")])) as typeof en;
}

const generated: Partial<Record<SupportedLocale, typeof en>> = { en, "pt-PT": ptPT };
for (const locale of supportedLocales) {
  if (locale === "en" || locale === "pt-PT") continue;
  console.log(`Translating ${locale}...`);
  generated[locale] = await translate(locale);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
Object.assign(generated["pt-BR"]!, { kicker: "Catálogo agronômico", title: "Culturas e variedades", description: "Use um catálogo estável de culturas e mantenha as variedades usadas pela organização.", cultures: "Culturas", varieties: "Variedades", search: "Pesquisar culturas", sourceDesignation: "Designação portuguesa de origem", records: "{count} culturas", addVariety: "Nova variedade", varietyName: "Nome da variedade", crop: "Cultura", save: "Salvar variedade", cancel: "Cancelar" });
const keyUnion = Object.keys(en).map((key) => JSON.stringify(key)).join(" | ");
const output = `// Generated from reviewed English and European Portuguese agronomic source copy.\nimport type { SupportedLocale } from "../../home-copy";\nexport type CropCopy = Record<${keyUnion}, string>;\nexport const cropCopies = ${JSON.stringify(generated, null, 2)} as const satisfies Record<SupportedLocale, CropCopy>;\n`;
await writeFile(new URL("../client/src/app/crops/crop-locales.generated.ts", import.meta.url), output, "utf8");
