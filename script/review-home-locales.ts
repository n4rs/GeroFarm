import { writeFile } from "node:fs/promises";
import { homepageCopies } from "../client/src/home-locales.generated";
import { en, ptPT, type HomepageCopy, type SupportedLocale } from "../client/src/home-copy";
import { applyHomepageCommercialReview } from "./home-commercial-copy";
import { applyHomepagePlanWeatherReview } from "./home-plan-weather-copy";

type Terms = { field: string; cultivation: string; operation: string; harvest: string; logbook: string; cookies: string; degreeDays: string; tagExamples: string };
const reviewedTerms: Record<Exclude<SupportedLocale, "en" | "pt-PT">, Terms> = {
  "pt-BR": { field: "Talhão", cultivation: "Plantio", operation: "Operação", harvest: "Colheita", logbook: "Caderno de campo", cookies: "Cookies", degreeDays: "Graus-dia", tagExamples: "Exemplos por tag do plantio" },
  fr: { field: "Parcelle", cultivation: "Culture", operation: "Opération", harvest: "Récolte", logbook: "Cahier de culture", cookies: "Cookies", degreeDays: "Degrés-jours de croissance", tagExamples: "Exemples par étiquette de culture" },
  es: { field: "Parcela", cultivation: "Cultivo", operation: "Operación", harvest: "Cosecha", logbook: "Cuaderno de campo", cookies: "Cookies", degreeDays: "Grados-día de crecimiento", tagExamples: "Ejemplos por etiqueta del cultivo" },
  nl: { field: "Perceel", cultivation: "Teelt", operation: "Bewerking", harvest: "Oogst", logbook: "Teeltregistratie", cookies: "Cookies", degreeDays: "Groeigraaddagen", tagExamples: "Voorbeelden per teeltlabel" },
  de: { field: "Schlag", cultivation: "Kultur", operation: "Maßnahme", harvest: "Ernte", logbook: "Schlagkartei", cookies: "Cookies", degreeDays: "Wachstumsgradtage", tagExamples: "Beispiele nach Kultur-Tag" },
  ja: { field: "圃場", cultivation: "栽培", operation: "作業", harvest: "収穫", logbook: "圃場記録", cookies: "Cookie", degreeDays: "積算温度", tagExamples: "作付けタグ別の例" },
  he: { field: "חלקה", cultivation: "גידול", operation: "פעולה", harvest: "קטיף", logbook: "יומן שדה", cookies: "קובצי Cookie", degreeDays: "ימי מעלה", tagExamples: "דוגמאות לפי תגית גידול" },
  tr: { field: "Parsel", cultivation: "Yetiştiricilik", operation: "İşlem", harvest: "Hasat", logbook: "Tarla kayıt defteri", cookies: "Çerezler", degreeDays: "Büyüme derece-günleri", tagExamples: "Yetiştiricilik etiketine göre örnekler" },
  ar: { field: "قطعة زراعية", cultivation: "زراعة", operation: "عملية", harvest: "حصاد", logbook: "سجل الحقل", cookies: "ملفات تعريف الارتباط", degreeDays: "أيام الدرجة الحرارية", tagExamples: "أمثلة حسب وسم الزراعة" },
  pl: { field: "Działka", cultivation: "Uprawa", operation: "Zabieg", harvest: "Zbiór", logbook: "Ewidencja polowa", cookies: "Pliki cookie", degreeDays: "Stopniodni wzrostu", tagExamples: "Przykłady według tagu uprawy" },
  hr: { field: "Parcela", cultivation: "Uzgoj", operation: "Zahvat", harvest: "Berba", logbook: "Evidencija polja", cookies: "Kolačići", degreeDays: "Stupanj-dani rasta", tagExamples: "Primjeri po oznaci uzgoja" },
  el: { field: "Αγροτεμάχιο", cultivation: "Καλλιέργεια", operation: "Εργασία", harvest: "Συγκομιδή", logbook: "Ημερολόγιο αγρού", cookies: "Cookies", degreeDays: "Βαθμοημέρες ανάπτυξης", tagExamples: "Παραδείγματα ανά ετικέτα καλλιέργειας" },
  sv: { field: "Skifte", cultivation: "Odling", operation: "Åtgärd", harvest: "Skörd", logbook: "Fältjournal", cookies: "Cookies", degreeDays: "Växtgraddagar", tagExamples: "Exempel per odlingstagg" },
  no: { field: "Skifte", cultivation: "Dyrking", operation: "Tiltak", harvest: "Innhøsting", logbook: "Skifteloggbok", cookies: "Informasjonskapsler", degreeDays: "Vekstgraddager", tagExamples: "Eksempler per dyrkingstagg" },
  da: { field: "Mark", cultivation: "Dyrkning", operation: "Arbejdsgang", harvest: "Høst", logbook: "Markjournal", cookies: "Cookies", degreeDays: "Vækstgraddage", tagExamples: "Eksempler pr. dyrkningstag" },
  it: { field: "Appezzamento", cultivation: "Coltivazione", operation: "Operazione", harvest: "Raccolta", logbook: "Quaderno di campagna", cookies: "Cookie", degreeDays: "Gradi giorno di crescita", tagExamples: "Esempi per tag della coltivazione" },
  uk: { field: "Ділянка", cultivation: "Вирощування", operation: "Операція", harvest: "Збір урожаю", logbook: "Польовий журнал", cookies: "Файли cookie", degreeDays: "Градусо-дні росту", tagExamples: "Приклади за тегом вирощування" },
  ro: { field: "Parcelă", cultivation: "Cultură", operation: "Operațiune", harvest: "Recoltare", logbook: "Registru de câmp", cookies: "Cookie-uri", degreeDays: "Grade-zile de creștere", tagExamples: "Exemple după eticheta culturii" },
  fi: { field: "Lohko", cultivation: "Viljely", operation: "Toimenpide", harvest: "Sadonkorjuu", logbook: "Lohkokirjanpito", cookies: "Evästeet", degreeDays: "Kasvukauden astepäivät", tagExamples: "Esimerkkejä viljelytunnisteen mukaan" },
  bg: { field: "Парцел", cultivation: "Отглеждане", operation: "Операция", harvest: "Реколта", logbook: "Дневник на полето", cookies: "Бисквитки", degreeDays: "Градусо-дни на растеж", tagExamples: "Примери по етикет на отглеждането" },
  hu: { field: "Tábla", cultivation: "Termesztés", operation: "Művelet", harvest: "Betakarítás", logbook: "Táblatörzskönyv", cookies: "Cookie-k", degreeDays: "Növekedési foknapok", tagExamples: "Példák termesztési címke szerint" },
  is: { field: "Reitur", cultivation: "Ræktun", operation: "Aðgerð", harvest: "Uppskera", logbook: "Akraskrá", cookies: "Vefkökur", degreeDays: "Vaxtargráðudagar", tagExamples: "Dæmi eftir ræktunarmerki" },
  sk: { field: "Parcela", cultivation: "Pestovanie", operation: "Zásah", harvest: "Zber", logbook: "Poľný denník", cookies: "Súbory cookie", degreeDays: "Rastové stupňodní", tagExamples: "Príklady podľa značky pestovania" },
  lt: { field: "Laukas", cultivation: "Auginimas", operation: "Operacija", harvest: "Derliaus nuėmimas", logbook: "Lauko žurnalas", cookies: "Slapukai", degreeDays: "Augimo laipsniadieniai", tagExamples: "Pavyzdžiai pagal auginimo žymą" },
  sl: { field: "Parcela", cultivation: "Gojenje", operation: "Opravilo", harvest: "Spravilo pridelka", logbook: "Poljski dnevnik", cookies: "Piškotki", degreeDays: "Rastne stopinjske dni", tagExamples: "Primeri po oznaki gojenja" },
  lv: { field: "Lauks", cultivation: "Audzēšana", operation: "Darbība", harvest: "Ražas novākšana", logbook: "Lauka žurnāls", cookies: "Sīkdatnes", degreeDays: "Augšanas grādu dienas", tagExamples: "Piemēri pēc audzēšanas taga" },
};

const reviewed = structuredClone(homepageCopies) as Record<SupportedLocale, HomepageCopy>;
reviewed.en = structuredClone(en);
reviewed["pt-PT"] = structuredClone(ptPT);
for (const copy of Object.values(reviewed)) {
  delete (copy.weather as HomepageCopy["weather"] & { status?: string }).status;
  delete (copy.modules as HomepageCopy["modules"] & { optional?: string }).optional;
}
for (const [locale, terms] of Object.entries(reviewedTerms) as Array<[Exclude<SupportedLocale, "en" | "pt-PT">, Terms]>) {
  const copy = reviewed[locale];
  copy.flow.stages = [terms.field, terms.cultivation, terms.operation, terms.harvest, terms.logbook];
  copy.platform.cards[7].title = terms.logbook;
  copy.weather.metrics[3] = terms.degreeDays;
  copy.footer.cookies = terms.cookies;
  if (copy.faq.items.length === 5) copy.faq.items.splice(2, 0, { q: `${copy.modules.inventory} + ${copy.modules.costs}`, a: copy.modules.description });
}

const ptBR = reviewed["pt-BR"];
ptBR.metaTitle = "Software de gestão agrícola de campo | GeroFarm";
ptBR.metaDescription = "Mapeie talhões, conecte plantios, operações, colheitas e meteorologia agronômica e mantenha um caderno de campo claro com o GeroFarm.";
Object.assign(ptBR.hero, { eyebrow: "Gestão agrícola sem complicações", title: "Toda a fazenda,", accent: "sob controle.", description: "Planeje, registre e acompanhe todo o trabalho agrícola em uma aplicação simples de usar, com visão completa da fazenda e planos acessíveis que crescem com você.", imageAlt: "Campos agrícolas com limites de talhões mapeados e pontos de observação agronômica", mapLabel: "Talhões mapeados", cropLabel: "Plantios ativos", operationLabel: "Operações registradas" });
ptBR.proof = ["Mapa e KML/KMZ", "Operações agrícolas completas", "Meteorologia por plantio", "Caderno de campo e rastreabilidade"];
ptBR.platform.description = "Estruture a fazenda, registre o que aconteceu e recupere o contexto de que sua equipe precisa.";
ptBR.platform.cards[7].description = "Estruture registros e evidências rastreáveis para apoiar a Produção Integrada e o Manejo Integrado de Pragas (MIP), a produção orgânica, GLOBALG.A.P. IFA, GRASP, SPRING e outros referenciais aplicáveis. A certificação permanece dependente do organismo competente.";
Object.assign(ptBR.modules, { kicker: "Estoque e custos sob controle", title: "Saiba o que tem, o que utiliza e quanto custa", description: "Acompanhe estoques e lotes, conecte cada consumo ao trabalho realizado e transforme mão de obra, equipamentos e insumos em custos claros por plantio e colheita.", inventory: "Estoque", inventoryDesc: "Consulte estoques, rastreabilidade de lotes, compras, movimentos e consumos, com cada recurso conectado à operação em que foi utilizado.", costs: "Custos", costsDesc: "Conheça o custo real de cada plantio e colheita, reunindo mão de obra, equipamentos, insumos e outros recursos sem dupla contabilização." });
ptBR.pricing.description = "Escolha a escala e a profundidade da meteorologia agronômica de que a fazenda precisa. Nenhum plano limita operações, colheitas ou cadernos de campo.";
ptBR.pricing.plans[0].features[3] = "5 talhões ativos";
ptBR.pricing.plans[1].features[2] = "50 talhões";
ptBR.pricing.plans[2].features[2] = "250 talhões";
ptBR.pricing.plans[3].features[1] = "Talhões e estações sob medida";
ptBR.footer.tagline = "Gestão agrícola clara, do mapa ao caderno de campo.";
applyHomepageCommercialReview(reviewed);
applyHomepagePlanWeatherReview(reviewed);

const output = `// Generated by script/generate-home-locales.ts and agronomically reviewed by script/review-home-locales.ts.\n// Do not edit by hand; regenerate, review and run the locale audit tests.\nimport type { HomepageCopy, SupportedLocale } from "./home-copy";\n\nexport const homepageCopies = ${JSON.stringify(reviewed, null, 2)} as const satisfies Record<SupportedLocale, HomepageCopy>;\n`;
await writeFile(new URL("../client/src/home-locales.generated.ts", import.meta.url), output, "utf8");
