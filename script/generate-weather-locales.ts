import { readFile, unlink, writeFile } from "node:fs/promises";
import {
  supportedLocales,
  type SupportedLocale,
} from "../client/src/home-copy";
import {
  weatherEnglishCopy,
  type WeatherCopy,
} from "../client/src/app/weather/weather-locales";

const language: Record<SupportedLocale, string> = {
  "pt-PT": "pt-pt",
  "pt-BR": "pt",
  en: "en",
  fr: "fr",
  es: "es",
  nl: "nl",
  de: "de",
  ja: "ja",
  he: "he",
  tr: "tr",
  ar: "ar",
  pl: "pl",
  hr: "hr",
  el: "el",
  sv: "sv",
  no: "nb",
  da: "da",
  it: "it",
  uk: "uk",
  ro: "ro",
  fi: "fi",
  bg: "bg",
  hu: "hu",
  is: "is",
  sk: "sk",
  lt: "lt",
  sl: "sl",
  lv: "lv",
};

language["pt-PT"] = "pt";

const ptPT: Partial<WeatherCopy> = {
  description:
    "Estações virtuais, previsões, histórico e indicadores agronómicos versionados geridos centralmente.",
  stationLimit: "Limite efetivo de estações",
  activeStations: "Estações ativas",
  archivedStations: "Estações arquivadas",
  name: "Nome",
  latitude: "Latitude",
  longitude: "Longitude",
  elevation: "Altitude",
  timezone: "Fuso horário",
  current: "Atual",
  hourly: "Horário",
  daily: "Diário",
  temperature: "Temperatura",
  precipitation: "Precipitação",
  humidity: "Humidade relativa",
  wind: "Vento",
  solarRadiation: "Radiação solar",
  cache: "Cache",
  fresh: "Atualizada",
  stale: "Desatualizada",
  provenance: "Proveniência da estação",
  effectiveFrom: "Vigente desde",
  suggest: "Sugerir por proximidade",
  assign: "Selecionar para a plantação",
  distance: "Distância",
  noAssignment: "Não existe uma estação selecionada para este período.",
  indicators: "Indicadores agronómicos",
  method: "Método",
  version: "Versão",
  inputs: "Dados de entrada",
  profile: "Parâmetros versionados da cultura",
  saveProfile: "Guardar nova versão dos parâmetros",
  crop: "Cultura",
  variety: "Variedade",
  campaign: "Campanha",
  degreeDayBase: "Temperatura base dos graus-dia",
  degreeDayUpper: "Limite superior dos graus-dia",
  leafWetnessThreshold: "Limiar de humidade relativa para molhamento foliar",
  window: "Janela de acumulação",
  custom: "Personalizada",
  indicateDate: "Indicar data",
  continueWithout: "Continuar sem indicar",
  vegetativeWarning:
    "Falta o início do ciclo vegetativo. Esta data nunca é inferida a partir de uma operação.",
  emergence: "Emergência da cultura",
  sowingFallback: "Data de sementeira (alternativa explícita)",
  transplant: "Transplantação / plantação",
  vegetativeStart: "Início do ciclo vegetativo",
  campaignStart: "Início da campanha",
  et0: "ET₀ FAO-56",
  degreeDays: "Graus-dia de crescimento",
  chillHours: "Horas de frio abaixo de 7,2 °C",
  modifiedChill: "Horas de frio modificadas",
  utah: "Unidades de frio Utah",
  dynamicChill: "Porções de frio do Modelo Dinâmico",
  leafWetness: "Molhamento foliar estimado",
  solarEnergy: "Energia solar",
  par: "PAR estimada",
  dli: "DLI estimada",
  readOnly:
    "Modo comercial de consulta: a meteorologia e o histórico existentes continuam disponíveis; as alterações estão desativadas.",
  limitReached: "Foi atingido o limite efetivo de estações virtuais.",
  historicalProvenance:
    "As consultas históricas mantêm a estação selecionada nesse período e não recalculam silenciosamente o passado.",
  refresh: "Atualizar",
  details: "Método e dados de entrada",
};

const ptBR: Partial<WeatherCopy> = {
  description:
    "Estações virtuais, previsões, histórico e indicadores agronômicos versionados gerenciados centralmente.",
  stationLimit: "Limite efetivo de estações",
  activeStations: "Estações ativas",
  archivedStations: "Estações arquivadas",
  timezone: "Fuso horário",
  hourly: "Por hora",
  daily: "Diário",
  humidity: "Umidade relativa",
  solarRadiation: "Radiação solar",
  provenance: "Proveniência da estação",
  effectiveFrom: "Vigente desde",
  suggest: "Sugerir por proximidade",
  assign: "Selecionar para o plantio",
  indicators: "Indicadores agronômicos",
  profile: "Parâmetros versionados da cultura",
  saveProfile: "Salvar nova versão dos parâmetros",
  crop: "Cultura",
  variety: "Variedade",
  campaign: "Safra",
  degreeDayBase: "Temperatura-base dos graus-dia",
  degreeDayUpper: "Limite superior dos graus-dia",
  leafWetnessThreshold: "Limiar de umidade relativa para molhamento foliar",
  window: "Janela de acumulação",
  custom: "Personalizada",
  indicateDate: "Informar data",
  continueWithout: "Continuar sem informar",
  vegetativeWarning:
    "Falta o início do ciclo vegetativo. Essa data nunca é inferida a partir de uma operação.",
  emergence: "Emergência da cultura",
  sowingFallback: "Data de semeadura (alternativa explícita)",
  transplant: "Transplante / plantio",
  vegetativeStart: "Início do ciclo vegetativo",
  campaignStart: "Início da safra",
  degreeDays: "Graus-dia de crescimento",
  chillHours: "Horas de frio abaixo de 7,2 °C",
  modifiedChill: "Horas de frio modificadas",
  utah: "Unidades de frio Utah",
  dynamicChill: "Porções de frio do Modelo Dinâmico",
  leafWetness: "Molhamento foliar estimado",
  solarEnergy: "Energia solar",
  par: "PAR estimada",
  dli: "DLI estimada",
  readOnly:
    "Modo comercial somente leitura: a meteorologia e o histórico existentes continuam disponíveis; as alterações estão desativadas.",
  limitReached: "O limite efetivo de estações virtuais foi atingido.",
  historicalProvenance:
    "As consultas históricas mantêm a estação selecionada naquele período e não recalculam silenciosamente o passado.",
  refresh: "Atualizar",
  details: "Método e dados de entrada",
};

const overrides: Partial<Record<SupportedLocale, Partial<WeatherCopy>>> = {
  "pt-PT": ptPT,
  "pt-BR": ptBR,
  fr: {
    degreeDays: "Degrés-jours de croissance",
    chillHours: "Heures de froid sous 7,2 °C",
    modifiedChill: "Heures de froid modifiées",
    utah: "Unités de froid Utah",
    dynamicChill: "Portions de froid du modèle dynamique",
    leafWetness: "Humectation foliaire estimée",
    vegetativeWarning:
      "Le début du cycle végétatif est manquant. Cette date n'est jamais déduite d'une opération agricole.",
  },
  es: {
    degreeDays: "Grados-día de crecimiento",
    chillHours: "Horas de frío por debajo de 7,2 °C",
    modifiedChill: "Horas de frío modificadas",
    utah: "Unidades de frío Utah",
    dynamicChill: "Porciones de frío del Modelo Dinámico",
    leafWetness: "Mojado foliar estimado",
    vegetativeWarning:
      "Falta el inicio del ciclo vegetativo. Esta fecha nunca se infiere a partir de una operación agrícola.",
  },
  nl: {
    degreeDays: "Groeigraaddagen",
    chillHours: "Koude-uren onder 7,2 °C",
    modifiedChill: "Aangepaste koude-uren",
    utah: "Utah-koude-eenheden",
    dynamicChill: "Koudeporties volgens het dynamisch model",
    leafWetness: "Geschatte bladnatheid",
    vegetativeWarning:
      "Het begin van de vegetatieve cyclus ontbreekt. Deze datum wordt nooit uit een landbouwbewerking afgeleid.",
  },
  de: {
    degreeDays: "Wachstumsgradtage",
    chillHours: "Kältestunden unter 7,2 °C",
    modifiedChill: "Modifizierte Kältestunden",
    utah: "Utah-Kälteeinheiten",
    dynamicChill: "Kälteportionen nach dem Dynamischen Modell",
    leafWetness: "Geschätzte Blattnässe",
    vegetativeWarning:
      "Der Beginn des Vegetationszyklus fehlt. Dieses Datum wird niemals aus einem Arbeitsgang abgeleitet.",
  },
  ja: {
    degreeDays: "生育積算温度",
    chillHours: "7.2 °C以下の低温遭遇時間",
    modifiedChill: "修正低温時間",
    utah: "ユタ低温単位",
    dynamicChill: "動的モデルの低温ポーション",
    leafWetness: "推定葉面湿潤",
    vegetativeWarning:
      "栄養成長サイクルの開始日がありません。この日付を農作業から推測することはありません。",
  },
  he: {
    degreeDays: "ימי מעלה לגידול",
    chillHours: "שעות קור מתחת ל-7.2 °C",
    modifiedChill: "שעות קור מתוקנות",
    utah: "יחידות קור יוטה",
    dynamicChill: "מנות צינון לפי המודל הדינמי",
    leafWetness: "רטיבות עלים מוערכת",
    vegetativeWarning:
      "תאריך תחילת המחזור הווגטטיבי חסר. לעולם אין להסיק אותו מפעולה חקלאית.",
  },
  tr: {
    degreeDays: "Büyüme derece-günleri",
    chillHours: "7,2 °C altındaki soğuklanma saatleri",
    modifiedChill: "Değiştirilmiş soğuklanma saatleri",
    utah: "Utah soğuklanma birimleri",
    dynamicChill: "Dinamik Model soğuklanma porsiyonları",
    leafWetness: "Tahmini yaprak ıslaklığı",
    vegetativeWarning:
      "Vejetatif döngünün başlangıç tarihi eksik. Bu tarih hiçbir zaman bir tarımsal işlemden çıkarılmaz.",
  },
  ar: {
    degreeDays: "أيام درجة النمو",
    chillHours: "ساعات البرودة تحت 7.2 °م",
    modifiedChill: "ساعات البرودة المعدلة",
    utah: "وحدات برودة يوتا",
    dynamicChill: "حصص البرودة وفق النموذج الديناميكي",
    leafWetness: "البلل الورقي التقديري",
    vegetativeWarning:
      "تاريخ بداية دورة النمو الخضري مفقود. لا يُستنتج هذا التاريخ مطلقًا من عملية زراعية.",
  },
  pl: {
    degreeDays: "Stopniodni wzrostu",
    chillHours: "Godziny chłodu poniżej 7,2 °C",
    modifiedChill: "Zmodyfikowane godziny chłodu",
    utah: "Jednostki chłodu Utah",
    dynamicChill: "Porcje chłodu według modelu dynamicznego",
    leafWetness: "Szacowane zwilżenie liści",
    vegetativeWarning:
      "Brakuje daty rozpoczęcia cyklu wegetacyjnego. Data ta nigdy nie jest wyznaczana na podstawie zabiegu agrotechnicznego.",
  },
  hr: {
    degreeDays: "Stupanj-dani rasta",
    chillHours: "Sati hladnoće ispod 7,2 °C",
    modifiedChill: "Modificirani sati hladnoće",
    utah: "Utah jedinice hladnoće",
    dynamicChill: "Porcije hladnoće prema dinamičkom modelu",
    leafWetness: "Procijenjeno vlaženje lista",
    vegetativeWarning:
      "Nedostaje datum početka vegetacijskog ciklusa. Taj se datum nikada ne izvodi iz agrotehničkog zahvata.",
  },
  el: {
    degreeDays: "Βαθμοημέρες ανάπτυξης",
    chillHours: "Ώρες ψύχους κάτω από 7,2 °C",
    modifiedChill: "Τροποποιημένες ώρες ψύχους",
    utah: "Μονάδες ψύχους Utah",
    dynamicChill: "Μερίδες ψύχους του Δυναμικού Μοντέλου",
    leafWetness: "Εκτιμώμενη διαβροχή φύλλων",
    vegetativeWarning:
      "Λείπει η ημερομηνία έναρξης του βλαστικού κύκλου. Η ημερομηνία αυτή δεν συνάγεται ποτέ από μια γεωργική εργασία.",
  },
  sv: {
    degreeDays: "Tillväxtgraddagar",
    chillHours: "Köldtimmar under 7,2 °C",
    modifiedChill: "Modifierade köldtimmar",
    utah: "Utah-köldenheter",
    dynamicChill: "Köldportioner enligt den dynamiska modellen",
    leafWetness: "Beräknad bladväta",
    vegetativeWarning:
      "Startdatum för den vegetativa cykeln saknas. Datumet härleds aldrig från en odlingsåtgärd.",
  },
  no: {
    degreeDays: "Vekstgraddager",
    chillHours: "Kuldetimer under 7,2 °C",
    modifiedChill: "Modifiserte kuldetimer",
    utah: "Utah-kuldeenheter",
    dynamicChill: "Kuldeporsjoner etter dynamisk modell",
    leafWetness: "Estimert bladvåthet",
    vegetativeWarning:
      "Startdatoen for den vegetative syklusen mangler. Datoen utledes aldri fra et agronomisk tiltak.",
  },
  da: {
    degreeDays: "Vækstgraddage",
    chillHours: "Kuldetimer under 7,2 °C",
    modifiedChill: "Modificerede kuldetimer",
    utah: "Utah-kuldeenheder",
    dynamicChill: "Kuldeportioner efter den dynamiske model",
    leafWetness: "Estimeret bladvådhed",
    vegetativeWarning:
      "Startdatoen for den vegetative cyklus mangler. Datoen udledes aldrig af en dyrkningshandling.",
  },
  it: {
    degreeDays: "Gradi giorno di crescita",
    chillHours: "Ore di freddo sotto 7,2 °C",
    modifiedChill: "Ore di freddo modificate",
    utah: "Unità di freddo Utah",
    dynamicChill: "Porzioni di freddo del Modello Dinamico",
    leafWetness: "Bagnatura fogliare stimata",
    vegetativeWarning:
      "Manca la data di inizio del ciclo vegetativo. Questa data non viene mai dedotta da un'operazione agronomica.",
  },
  uk: {
    degreeDays: "Сума активних температур",
    chillHours: "Години холоду нижче 7,2 °C",
    modifiedChill: "Модифіковані години холоду",
    utah: "Одиниці холоду Utah",
    dynamicChill: "Порції холоду за Динамічною моделлю",
    leafWetness: "Оцінене зволоження листя",
    vegetativeWarning:
      "Відсутня дата початку вегетаційного циклу. Цю дату ніколи не визначають за агротехнічною операцією.",
  },
  ro: {
    degreeDays: "Grade-zile de creștere",
    chillHours: "Ore de frig sub 7,2 °C",
    modifiedChill: "Ore de frig modificate",
    utah: "Unități de frig Utah",
    dynamicChill: "Porții de frig după modelul dinamic",
    leafWetness: "Umezeală foliară estimată",
    vegetativeWarning:
      "Lipsește data de început a ciclului vegetativ. Această dată nu este niciodată dedusă dintr-o lucrare agricolă.",
  },
  fi: {
    degreeDays: "Kasvukauden lämpösumma",
    chillHours: "Kylmätunnit alle 7,2 °C",
    modifiedChill: "Muokatut kylmätunnit",
    utah: "Utah-kylmäyksiköt",
    dynamicChill: "Dynaamisen mallin kylmäannokset",
    leafWetness: "Arvioitu lehtikosteus",
    vegetativeWarning:
      "Kasvukauden alkamispäivä puuttuu. Päivämäärää ei koskaan päätellä viljelytoimenpiteestä.",
  },
  bg: {
    degreeDays: "Растежни градус-дни",
    chillHours: "Часове на студ под 7,2 °C",
    modifiedChill: "Модифицирани часове на студ",
    utah: "Единици студ Utah",
    dynamicChill: "Студови порции по Динамичния модел",
    leafWetness: "Оценена листна влажност",
    vegetativeWarning:
      "Липсва датата за начало на вегетационния цикъл. Тази дата никога не се извежда от агротехническа операция.",
  },
  hu: {
    degreeDays: "Növekedési foknapok",
    chillHours: "Hidegórák 7,2 °C alatt",
    modifiedChill: "Módosított hidegórák",
    utah: "Utah hidegegységek",
    dynamicChill: "A dinamikus modell hidegporciói",
    leafWetness: "Becsült levélnedvesség",
    vegetativeWarning:
      "Hiányzik a vegetációs ciklus kezdő dátuma. Ezt a dátumot soha nem következtetjük ki egy műveletből.",
  },
  is: {
    degreeDays: "Vaxtargráðudagar",
    chillHours: "Kælistundir undir 7,2 °C",
    modifiedChill: "Breyttar kælistundir",
    utah: "Utah-kælieiningar",
    dynamicChill: "Kælihlutar samkvæmt kvika líkaninu",
    leafWetness: "Áætluð blaðvæta",
    vegetativeWarning:
      "Upphafsdag gróðurhringsins vantar. Dagsetningin er aldrei ályktuð út frá ræktunaraðgerð.",
  },
  sk: {
    degreeDays: "Rastové stupňodni",
    chillHours: "Hodiny chladu pod 7,2 °C",
    modifiedChill: "Modifikované hodiny chladu",
    utah: "Utah jednotky chladu",
    dynamicChill: "Chladové porcie podľa dynamického modelu",
    leafWetness: "Odhadované ovlhčenie listov",
    vegetativeWarning:
      "Chýba dátum začiatku vegetačného cyklu. Tento dátum sa nikdy neodvodzuje z agrotechnického zásahu.",
  },
  lt: {
    degreeDays: "Augimo laipsniadieniai",
    chillHours: "Šalčio valandos žemiau 7,2 °C",
    modifiedChill: "Modifikuotos šalčio valandos",
    utah: "Utah šalčio vienetai",
    dynamicChill: "Dinaminio modelio šalčio porcijos",
    leafWetness: "Apskaičiuotas lapų drėgnumas",
    vegetativeWarning:
      "Trūksta vegetatyvinio ciklo pradžios datos. Ši data niekada nenustatoma pagal agronominę operaciją.",
  },
  sl: {
    degreeDays: "Rastne stopinjske dni",
    chillHours: "Hladne ure pod 7,2 °C",
    modifiedChill: "Spremenjene hladne ure",
    utah: "Utah hladne enote",
    dynamicChill: "Hladne porcije po dinamičnem modelu",
    leafWetness: "Ocenjena omočenost listov",
    vegetativeWarning:
      "Manjka datum začetka vegetacijskega cikla. Ta datum se nikoli ne sklepa iz agrotehničnega ukrepa.",
  },
  lv: {
    degreeDays: "Augšanas grāddienas",
    chillHours: "Aukstuma stundas zem 7,2 °C",
    modifiedChill: "Modificētās aukstuma stundas",
    utah: "Utah aukstuma vienības",
    dynamicChill: "Dinamiskā modeļa aukstuma porcijas",
    leafWetness: "Aprēķināts lapu mitrums",
    vegetativeWarning:
      "Trūkst veģetatīvā cikla sākuma datuma. Šo datumu nekad nenosaka pēc agrotehniskas darbības.",
  },
};

const translationSource: WeatherCopy = {
  ...weatherEnglishCopy,
  description:
    "Centrally managed virtual stations, forecasts, history and versioned agronomic indicators.",
};
const keys = Object.keys(translationSource) as Array<keyof WeatherCopy>;
const cacheUrl = new URL("../.weather-translation-cache.json", import.meta.url);

type BingSession = { ig: string; key: string; token: string; cookie: string };

async function createBingSession(): Promise<BingSession> {
  const response = await fetch("https://www.bing.com/translator", {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  if (!response.ok)
    throw new Error(`Translator bootstrap failed: ${response.status}`);
  const html = await response.text();
  const ig = /IG:"([^"]+)"/.exec(html)?.[1];
  const protection =
    /params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)"/.exec(html);
  if (!ig || !protection)
    throw new Error("Translator bootstrap response changed");
  return {
    ig,
    key: protection[1],
    token: protection[2],
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; "),
  };
}

async function translateBatch(
  values: string[],
  target: string,
  session: BingSession,
) {
  const source = values
    .map((value, index) => `[[[${String(index).padStart(3, "0")}]]] ${value}`)
    .join("\n");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const body = new URLSearchParams({
        fromLang: "en",
        to: target,
        text: source,
        token: session.token,
        key: session.key,
      });
      const response = await fetch(
        `https://www.bing.com/ttranslatev3?isVertical=1&IG=${session.ig}&IID=translator.5028.1`,
        {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "Mozilla/5.0",
            referer: "https://www.bing.com/translator",
            origin: "https://www.bing.com",
            ...(session.cookie ? { cookie: session.cookie } : {}),
          },
          body,
        },
      );
      if (response.ok) {
        const payload = (await response.json()) as Array<{
          translations?: Array<{ text?: string }>;
        }>;
        const translated = payload[0]?.translations?.[0]?.text || "";
        const parts = [
          ...translated.matchAll(
            /\[\[\[(\d{3})\]\]\]\s*([\s\S]*?)(?=\n\[\[\[\d{3}\]\]\]|$)/g,
          ),
        ];
        if (parts.length === values.length)
          return parts.map((part) => part[2].trim());
        if (attempt === 4)
          console.warn(
            `Translation marker mismatch for ${target}: ${parts.length}/${values.length}`,
          );
      } else if (attempt === 4)
        console.warn(`Translator returned ${response.status} for ${target}`);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw new Error(`Weather translation batch failed: ${target}`);
}

let result = {} as Record<SupportedLocale, WeatherCopy>;
try {
  result = JSON.parse(await readFile(cacheUrl, "utf8"));
} catch {
  try {
    result = (
      await import("../client/src/app/weather/weather-locales.generated")
    ).weatherCopies as Record<SupportedLocale, WeatherCopy>;
  } catch {}
}

for (const locale of supportedLocales) {
  if (result[locale] && keys.every((key) => result[locale][key])) {
    Object.assign(result[locale], overrides[locale]);
    continue;
  }
  if (locale === "en") {
    result.en = translationSource;
    continue;
  }
  const session = await createBingSession();
  const values: string[] = [];
  for (let cursor = 0; cursor < keys.length; cursor += 12) {
    values.push(
      ...(await translateBatch(
        keys.slice(cursor, cursor + 12).map((key) => translationSource[key]),
        language[locale],
        session,
      )),
    );
  }
  const copy = Object.fromEntries(
    keys.map((key, index) => [key, values[index]]),
  ) as WeatherCopy;
  Object.assign(copy, overrides[locale]);
  result[locale] = copy;
  await writeFile(cacheUrl, JSON.stringify(result), "utf8");
  console.log(`${locale}: ${keys.length}`);
}

await writeFile(
  new URL(
    "../client/src/app/weather/weather-locales.generated.ts",
    import.meta.url,
  ),
  `import type { SupportedLocale } from "../../home-copy";import type { WeatherCopy } from "./weather-locales";export type { WeatherCopy } from "./weather-locales";export const weatherCopies=${JSON.stringify(result, null, 2)} as const satisfies Record<SupportedLocale,WeatherCopy>;\n`,
  "utf8",
);
await unlink(cacheUrl).catch(() => undefined);
