import { readFile, unlink, writeFile } from "node:fs/promises";
import { supportedLocales, type SupportedLocale } from "../client/src/home-copy";
import { planEnglishCopy, type PlanCopy } from "../client/src/app/plans/plan-copy-source";

const language: Record<SupportedLocale, string> = { "pt-PT":"pt","pt-BR":"pt",en:"en",fr:"fr",es:"es",nl:"nl",de:"de",ja:"ja",he:"he",tr:"tr",ar:"ar",pl:"pl",hr:"hr",el:"el",sv:"sv",no:"nb",da:"da",it:"it",uk:"uk",ro:"ro",fi:"fi",bg:"bg",hu:"hu",is:"is",sk:"sk",lt:"lt",sl:"sl",lv:"lv" };

const overrides: Partial<Record<SupportedLocale, Partial<PlanCopy>>> = {
  "pt-PT": { kicker:"Decisão agronómica",title:"Planos de fertilização",description:"Planeie as necessidades nutricionais da cultura e compare-as com as fontes previstas e os nutrientes efetivamente aplicados.",addPlan:"Criar plano",activePlans:"Planos em vigor",drafts:"Rascunhos",warnings:"Avisos",history:"Histórico",empty:"Ainda não foi criado nenhum plano de fertilização.",loadError:"Não foi possível carregar os planos de fertilização.",saveError:"Não foi possível guardar o plano de fertilização.",name:"Nome do plano",culture:"Cultura",period:"Período do plano",startsOn:"Data de início",endsOn:"Data de fim",status:"Estado",draft:"Rascunho",inForce:"Em vigor",superseded:"Substituído",version:"Versão",objectives:"Necessidades de nutrientes",plannedSources:"Fontes de nutrientes previstas",delivered:"Efetivamente aplicado",remaining:"Em falta para o objetivo",plannedBalance:"Diferença após as fontes previstas",fieldPlans:"Planos individuais por talhão",fieldOne:"{count} plano de talhão",fieldTwo:"{count} planos de talhão",fieldFew:"{count} planos de talhão",fieldMany:"{count} planos de talhão",fieldZero:"{count} planos de talhão",fieldOther:"{count} planos de talhão",target:"Destino agronómico",currentPlantation:"Plantação atual",nextPlanting:"Próxima plantação",currentCampaign:"Campanha atual",nextCampaign:"Campanha seguinte",sourceName:"Nome da fonte",addSource:"Adicionar fonte",noSources:"Não foi prevista nenhuma fonte de nutrientes.",irrigationForecast:"Previsão de rega (m³/ha)",irrigationSector:"Snapshot do setor de rega",nitrateAnalysis:"Snapshot da análise de nitratos",nitrateDate:"Data da colheita da amostra",nitrateValue:"Nitratos (mg/L)",includeCoverCrop:"Considerar a contribuição da cultura de cobertura",coverCropContribution:"Contribuição da cultura de cobertura",activate:"Colocar em vigor",saveDraft:"Guardar rascunho",close:"Fechar",details:"Ver balanço",operationNotice:"Os valores realizados provêm diretamente das operações físicas concluídas; produtos, recursos, custos e nutrientes nunca são duplicados no plano.",optionalSnapshotNotice:"Os setores de rega e as análises de nitratos são snapshots históricos facultativos até os respetivos módulos de origem estarem disponíveis.",missingIrrigationSector:"Sem snapshot do setor de rega",missingNitrateAnalysis:"Sem snapshot da análise de nitratos",staleNitrateAnalysis:"A análise de nitratos tem mais de um ano",unknownComposition:"Pelo menos um produto aplicado tem composição desconhecida",objectiveExceeded:"Pelo menos um objetivo de nutrientes foi ultrapassado",fieldsRequired:"Selecione pelo menos um talhão.",kgHa:"kg/ha" },
  "pt-BR": { kicker:"Decisão agronômica",title:"Planos de adubação",description:"Planeje as necessidades nutricionais da cultura e compare-as com as fontes previstas e os nutrientes efetivamente aplicados.",addPlan:"Criar plano",activePlans:"Planos vigentes",drafts:"Rascunhos",warnings:"Avisos",history:"Histórico",empty:"Ainda não foi criado nenhum plano de adubação.",loadError:"Não foi possível carregar os planos de adubação.",saveError:"Não foi possível salvar o plano de adubação.",name:"Nome do plano",culture:"Cultura",period:"Período do plano",startsOn:"Data de início",endsOn:"Data de término",status:"Status",draft:"Rascunho",inForce:"Vigente",superseded:"Substituído",version:"Versão",objectives:"Necessidades de nutrientes",plannedSources:"Fontes de nutrientes previstas",delivered:"Efetivamente aplicado",remaining:"Restante até a meta",plannedBalance:"Diferença após as fontes previstas",fieldPlans:"Planos individuais por talhão",fieldOne:"{count} plano de talhão",fieldTwo:"{count} planos de talhão",fieldFew:"{count} planos de talhão",fieldMany:"{count} planos de talhão",fieldZero:"{count} planos de talhão",fieldOther:"{count} planos de talhão",target:"Destino agronômico",currentPlantation:"Plantio atual",nextPlanting:"Próximo plantio",currentCampaign:"Safra atual",nextCampaign:"Próxima safra",sourceName:"Nome da fonte",addSource:"Adicionar fonte",noSources:"Nenhuma fonte de nutrientes foi prevista.",irrigationForecast:"Previsão de irrigação (m³/ha)",irrigationSector:"Snapshot do setor de irrigação",nitrateAnalysis:"Snapshot da análise de nitrato",nitrateDate:"Data da coleta",nitrateValue:"Nitrato (mg/L)",includeCoverCrop:"Considerar a contribuição da cultura de cobertura",coverCropContribution:"Contribuição da cultura de cobertura",activate:"Colocar em vigor",saveDraft:"Salvar rascunho",close:"Fechar",details:"Ver balanço",operationNotice:"Os valores realizados vêm diretamente das operações físicas concluídas; produtos, recursos, custos e nutrientes nunca são duplicados no plano.",optionalSnapshotNotice:"Os setores de irrigação e as análises de nitrato são snapshots históricos opcionais até os respectivos módulos de origem estarem disponíveis.",missingIrrigationSector:"Sem snapshot do setor de irrigação",missingNitrateAnalysis:"Sem snapshot da análise de nitrato",staleNitrateAnalysis:"A análise de nitrato tem mais de um ano",unknownComposition:"Pelo menos um produto aplicado tem composição desconhecida",objectiveExceeded:"Pelo menos uma meta de nutrientes foi ultrapassada",fieldsRequired:"Selecione pelo menos um talhão.",kgHa:"kg/ha" },
  fr:{title:"Plans de fertilisation",objectives:"Besoins en éléments nutritifs",plannedSources:"Sources nutritives prévues",delivered:"Apports réellement effectués",remaining:"Reste à apporter",fieldPlans:"Plans individuels par parcelle"},
  es:{title:"Planes de fertilización",objectives:"Necesidades de nutrientes",plannedSources:"Fuentes de nutrientes previstas",delivered:"Aplicado realmente",remaining:"Pendiente hasta el objetivo",fieldPlans:"Planes individuales por parcela"},
  nl:{title:"Bemestingsplannen",objectives:"Nutriëntenbehoefte",plannedSources:"Geplande nutriëntenbronnen",delivered:"Werkelijk toegediend",remaining:"Resterend tot de streefwaarde"},
  de:{title:"Düngepläne",objectives:"Nährstoffbedarf",plannedSources:"Geplante Nährstoffquellen",delivered:"Tatsächlich ausgebracht",remaining:"Verbleibend bis zum Zielwert"},
  ja:{title:"施肥計画",objectives:"養分必要量",plannedSources:"予定する養分供給源",delivered:"実際の施用量",remaining:"目標までの残量"},
  he:{title:"תוכניות דישון",objectives:"דרישות חומרי הזנה",plannedSources:"מקורות הזנה מתוכננים",delivered:"יושם בפועל",remaining:"יתרה עד ליעד"},
  tr:{title:"Gübreleme planları",objectives:"Bitki besin maddesi gereksinimleri",plannedSources:"Planlanan besin maddesi kaynakları",delivered:"Gerçekte uygulanan",remaining:"Hedefe kalan"},
  ar:{title:"خطط التسميد",objectives:"الاحتياجات من العناصر الغذائية",plannedSources:"مصادر العناصر الغذائية المخططة",delivered:"المضاف فعليًا",remaining:"المتبقي حتى الهدف"},
  pl:{title:"Plany nawożenia",objectives:"Potrzeby pokarmowe",plannedSources:"Planowane źródła składników pokarmowych",delivered:"Faktycznie zastosowano",remaining:"Pozostało do celu"},
  hr:{title:"Planovi gnojidbe",objectives:"Potrebe za hranivima",plannedSources:"Planirani izvori hraniva",delivered:"Stvarno primijenjeno",remaining:"Preostalo do cilja"},
  el:{title:"Σχέδια λίπανσης",objectives:"Ανάγκες σε θρεπτικά στοιχεία",plannedSources:"Προγραμματισμένες πηγές θρεπτικών στοιχείων",delivered:"Πραγματική εφαρμογή",remaining:"Υπόλοιπο έως τον στόχο"},
  sv:{title:"Gödslingsplaner",objectives:"Växtnäringsbehov",plannedSources:"Planerade växtnäringskällor",delivered:"Faktiskt tillfört",remaining:"Återstår till målet"},
  no:{title:"Gjødslingsplaner",objectives:"Næringsbehov",plannedSources:"Planlagte næringskilder",delivered:"Faktisk tilført",remaining:"Gjenstår til målet"},
  da:{title:"Gødningsplaner",objectives:"Næringsstofbehov",plannedSources:"Planlagte næringsstofkilder",delivered:"Faktisk tilført",remaining:"Resterer til målet"},
  it:{title:"Piani di fertilizzazione",objectives:"Fabbisogni nutritivi",plannedSources:"Fonti nutritive previste",delivered:"Apporto effettivo",remaining:"Residuo rispetto all'obiettivo"},
  uk:{title:"Плани удобрення",objectives:"Потреби в елементах живлення",plannedSources:"Заплановані джерела живлення",delivered:"Фактично внесено",remaining:"Залишок до цілі"},
  ro:{title:"Planuri de fertilizare",objectives:"Necesar de nutrienți",plannedSources:"Surse de nutrienți planificate",delivered:"Aplicat efectiv",remaining:"Rămas până la obiectiv"},
  fi:{title:"Lannoitussuunnitelmat",objectives:"Ravinnetarve",plannedSources:"Suunnitellut ravinnelähteet",delivered:"Toteutunut levitys",remaining:"Tavoitteesta jäljellä"},
  bg:{title:"Планове за торене",objectives:"Потребности от хранителни елементи",plannedSources:"Планирани източници на хранителни елементи",delivered:"Реално внесено",remaining:"Остава до целта"},
  hu:{title:"Tápanyag-gazdálkodási tervek",objectives:"Tápanyagigény",plannedSources:"Tervezett tápanyagforrások",delivered:"Ténylegesen kijuttatva",remaining:"A célig hátralévő mennyiség"},
  is:{title:"Áburðaráætlanir",objectives:"Næringarþörf",plannedSources:"Áætlaðar næringaruppsprettur",delivered:"Raunverulega borið á",remaining:"Eftir að markmiði"},
  sk:{title:"Plány hnojenia",objectives:"Potreba živín",plannedSources:"Plánované zdroje živín",delivered:"Skutočne aplikované",remaining:"Zostáva do cieľa"},
  lt:{title:"Tręšimo planai",objectives:"Maisto medžiagų poreikis",plannedSources:"Planuojami maisto medžiagų šaltiniai",delivered:"Faktiškai panaudota",remaining:"Liko iki tikslo"},
  sl:{title:"Načrti gnojenja",objectives:"Potrebe po hranilih",plannedSources:"Načrtovani viri hranil",delivered:"Dejansko uporabljeno",remaining:"Preostanek do cilja"},
  lv:{title:"Mēslošanas plāni",objectives:"Barības elementu vajadzība",plannedSources:"Plānotie barības elementu avoti",delivered:"Faktiski iestrādāts",remaining:"Atlikums līdz mērķim"},
};

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
let credentials: { ig: string; iid: string; key: string; token: string } | undefined;
async function bingCredentials() {
  if (credentials) return credentials;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch("https://www.bing.com/translator", { headers: { "user-agent": userAgent } });
      const html = await response.text();
      const ig = /"ig":"(.*?)"/.exec(html)?.[1];
      const iid = [...html.matchAll(/data-iid="(.*?)"/g)].at(-1)?.[1];
      const abuse = /params_AbusePreventionHelper\s*=\s*\[(.*?),"(.*?)",/.exec(html);
      if (response.ok && ig && iid && abuse) return credentials = { ig, iid, key: abuse[1], token: abuse[2] };
    } catch { /* retry transient network failures */ }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error("Could not obtain Bing translation credentials.");
}
async function translate(text: string, target: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const auth = await bingCredentials();
      const body = new URLSearchParams({ fromLang: "en", to: target, text, token: auth.token, key: auth.key });
      const response = await fetch(`https://www.bing.com/ttranslatev3?isVertical=1&IG=${auth.ig}&IID=${auth.iid}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": userAgent }, body });
      if (response.ok) {
        const payload = await response.json() as Array<{ translations: Array<{ text: string }> }>;
        if (payload[0]?.translations[0]?.text) return payload[0].translations[0].text;
      }
    } catch { /* retry transient network failures */ }
    credentials = undefined;
    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  throw new Error(`Translation failed for ${target}: ${text}`);
}

const keys = Object.keys(planEnglishCopy) as Array<keyof PlanCopy>;
const cacheUrl = new URL("../.plan-translation-cache.json", import.meta.url);
let result = {} as Record<SupportedLocale, PlanCopy>;
try { result = JSON.parse(await readFile(cacheUrl, "utf8")); } catch { /* first run */ }
for (const locale of supportedLocales) {
  if (result[locale] && keys.every((key) => result[locale][key])) { console.log(`${locale}: cached`); continue; }
  if (locale === "en") { result.en = planEnglishCopy; await writeFile(cacheUrl, JSON.stringify(result), "utf8"); continue; }
  if (keys.every((key) => overrides[locale]?.[key])) {
    result[locale] = overrides[locale] as PlanCopy;
    await writeFile(cacheUrl, JSON.stringify(result), "utf8");
    console.log(`${locale}: ${keys.length} reviewed strings`);
    continue;
  }
  const copy = {} as PlanCopy;
  let cursor = 0;
  const workers = Array.from({ length: 2 }, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++];
      copy[key] = await translate(planEnglishCopy[key], language[locale]);
    }
  });
  await Promise.all(workers);
  Object.assign(copy, overrides[locale]);
  result[locale] = copy;
  await writeFile(cacheUrl, JSON.stringify(result), "utf8");
  console.log(`${locale}: ${keys.length} strings`);
}
await writeFile(new URL("../client/src/app/plans/plan-locales.generated.ts", import.meta.url), `import type { SupportedLocale } from "../../home-copy";import type { PlanCopy } from "./plan-copy-source";export type { PlanCopy } from "./plan-copy-source";export const planCopies=${JSON.stringify(result,null,2)} as const satisfies Record<SupportedLocale,PlanCopy>;\n`, "utf8");
await unlink(cacheUrl).catch(() => undefined);
