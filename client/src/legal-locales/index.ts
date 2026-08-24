import { arLegal } from "./legal/ar";
import { arCookies } from "./cookies/ar";
import { bgLegal } from "./legal/bg";
import { bgCookies } from "./cookies/bg";
import { daLegal } from "./legal/da";
import { daCookies } from "./cookies/da";
import { deLegal } from "./legal/de";
import { deCookies } from "./cookies/de";
import { elLegal } from "./legal/el";
import { elCookies } from "./cookies/el";
import { enLegal } from "./legal/en";
import { enCookies } from "./cookies/en";
import { esLegal } from "./legal/es";
import { esCookies } from "./cookies/es";
import { fiLegal } from "./legal/fi";
import { fiCookies } from "./cookies/fi";
import { frLegal } from "./legal/fr";
import { frCookies } from "./cookies/fr";
import { heLegal } from "./legal/he";
import { heCookies } from "./cookies/he";
import { hrLegal } from "./legal/hr";
import { hrCookies } from "./cookies/hr";
import { huLegal } from "./legal/hu";
import { huCookies } from "./cookies/hu";
import { isLegal } from "./legal/is";
import { isCookies } from "./cookies/is";
import { itLegal } from "./legal/it";
import { itCookies } from "./cookies/it";
import { jaLegal } from "./legal/ja";
import { jaCookies } from "./cookies/ja";
import { ltLegal } from "./legal/lt";
import { ltCookies } from "./cookies/lt";
import { lvLegal } from "./legal/lv";
import { lvCookies } from "./cookies/lv";
import { nlLegal } from "./legal/nl";
import { nlCookies } from "./cookies/nl";
import { noLegal } from "./legal/no";
import { noCookies } from "./cookies/no";
import { plLegal } from "./legal/pl";
import { plCookies } from "./cookies/pl";
import { ptBRLegal } from "./legal/pt-BR";
import { ptBRCookies } from "./cookies/pt-BR";
import { ptPTLegal } from "./legal/pt-PT";
import { ptPTCookies } from "./cookies/pt-PT";
import { roLegal } from "./legal/ro";
import { roCookies } from "./cookies/ro";
import { skLegal } from "./legal/sk";
import { skCookies } from "./cookies/sk";
import { slLegal } from "./legal/sl";
import { slCookies } from "./cookies/sl";
import { svLegal } from "./legal/sv";
import { svCookies } from "./cookies/sv";
import { trLegal } from "./legal/tr";
import { trCookies } from "./cookies/tr";
import { ukLegal } from "./legal/uk";
import { ukCookies } from "./cookies/uk";

export const legalMessages = {
  "ar": { ...arLegal, ...arCookies },
  "bg": { ...bgLegal, ...bgCookies },
  "da": { ...daLegal, ...daCookies },
  "de": { ...deLegal, ...deCookies },
  "el": { ...elLegal, ...elCookies },
  "en": { ...enLegal, ...enCookies },
  "es": { ...esLegal, ...esCookies },
  "fi": { ...fiLegal, ...fiCookies },
  "fr": { ...frLegal, ...frCookies },
  "he": { ...heLegal, ...heCookies },
  "hr": { ...hrLegal, ...hrCookies },
  "hu": { ...huLegal, ...huCookies },
  "is": { ...isLegal, ...isCookies },
  "it": { ...itLegal, ...itCookies },
  "ja": { ...jaLegal, ...jaCookies },
  "lt": { ...ltLegal, ...ltCookies },
  "lv": { ...lvLegal, ...lvCookies },
  "nl": { ...nlLegal, ...nlCookies },
  "no": { ...noLegal, ...noCookies },
  "pl": { ...plLegal, ...plCookies },
  "pt-BR": { ...ptBRLegal, ...ptBRCookies },
  "pt-PT": { ...ptPTLegal, ...ptPTCookies },
  "ro": { ...roLegal, ...roCookies },
  "sk": { ...skLegal, ...skCookies },
  "sl": { ...slLegal, ...slCookies },
  "sv": { ...svLegal, ...svCookies },
  "tr": { ...trLegal, ...trCookies },
  "uk": { ...ukLegal, ...ukCookies },
} as const;
