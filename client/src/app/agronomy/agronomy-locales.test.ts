import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales, type SupportedLocale } from "../../home-copy";
import { agronomyCopies, agronomyCount } from "./agronomy-locales";

test("agronomy has exact, non-English catalogs for all 28 locales",()=>{assert.equal(Object.keys(agronomyCopies).length,28);const keys=Object.keys(agronomyCopies.en).sort();for(const locale of supportedLocales){assert.deepEqual(Object.keys(agronomyCopies[locale]).sort(),keys);for(const value of Object.values(agronomyCopies[locale]))assert.ok(Array.isArray(value)||String(value).trim());if(locale!=="en")assert.notEqual(agronomyCopies[locale].monitoring,agronomyCopies.en.monitoring)}});

const counts = [0, 1, 2, 3, 11, 21, 1.5] as const;
const expected: Partial<Record<SupportedLocale, { monitoring: string[]; harvest: string[] }>> = {
  ar: { monitoring:["لا ملاحظات","ملاحظة واحدة","ملاحظتان","3 ملاحظات","11 ملاحظة","21 ملاحظة","1.5 ملاحظة"], harvest:["لا توجد عمليات حصاد","عملية حصاد واحدة","عمليتا حصاد","3 عمليات حصاد","11 عملية حصاد","21 عملية حصاد","1.5 عملية حصاد"] },
  he: { monitoring:["0 תצפיות","1 תצפית","שתי תצפיות","3 תצפיות","11 תצפיות","21 תצפיות","1.5 תצפיות"], harvest:["0 קטיפים","1 קטיף","שני קטיפים","3 קטיפים","11 קטיפים","21 קטיפים","1.5 קטיפים"] },
  pl: { monitoring:["0 obserwacji","1 obserwacja","2 obserwacje","3 obserwacje","11 obserwacji","21 obserwacji","1,5 obserwacji"], harvest:["0 zbiorów","1 zbiór","2 zbiory","3 zbiory","11 zbiorów","21 zbiorów","1,5 zbiorów"] },
  uk: { monitoring:["0 спостережень","1 спостереження","2 спостереження","3 спостереження","11 спостережень","21 спостереження","1,5 спостереження"], harvest:["0 зборів","1 збір","2 збори","3 збори","11 зборів","21 збір","1,5 збору"] },
  ro: { monitoring:["0 observații","1 observație","2 observații","3 observații","11 observații","21 de observații","1,5 observații"], harvest:["0 recoltări","1 recoltare","2 recoltări","3 recoltări","11 recoltări","21 de recoltări","1,5 recoltări"] },
  hr: { monitoring:["0 opažanja","1 opažanje","2 opažanja","3 opažanja","11 opažanja","21 opažanje","1,5 opažanja"], harvest:["0 berbi","1 berba","2 berbe","3 berbe","11 berbi","21 berba","1,5 berbi"] },
  sl: { monitoring:["0 opazovanj","1 opazovanje","2 opazovanji","3 opazovanja","11 opazovanj","21 opazovanj","1,5 opazovanja"], harvest:["0 žetev","1 žetev","2 žetvi","3 žetve","11 žetev","21 žetev","1,5 žetve"] },
  sk: { monitoring:["0 pozorovaní","1 pozorovanie","2 pozorovania","3 pozorovania","11 pozorovaní","21 pozorovaní","1,5 pozorovania"], harvest:["0 zberov","1 zber","2 zbery","3 zbery","11 zberov","21 zberov","1,5 zberu"] },
  lt: { monitoring:["0 stebėjimų","1 stebėjimas","2 stebėjimai","3 stebėjimai","11 stebėjimų","21 stebėjimas","1,5 stebėjimo"], harvest:["0 derlių","1 derlius","2 derliai","3 derliai","11 derlių","21 derlius","1,5 derliaus"] },
  lv: { monitoring:["0 novērojumu","1 novērojums","2 novērojumi","3 novērojumi","11 novērojumu","21 novērojums","1,5 novērojumi"], harvest:["0 ražu","1 raža","2 ražas","3 ražas","11 ražu","21 raža","1,5 ražas"] },
};

test("complex locales render exact final phrases for integers and decimals",()=>{for(const [locale,phrases] of Object.entries(expected) as [SupportedLocale,NonNullable<(typeof expected)[SupportedLocale]>][]){for(const kind of ["monitoring","harvest"] as const){assert.deepEqual(counts.map(count=>agronomyCount(agronomyCopies[locale],kind,count,locale)),phrases[kind],`${locale}.${kind}`)}}});
test("simple locales retain locale-formatted complete phrases",()=>{for(const locale of supportedLocales.filter(locale=>!expected[locale])){for(const count of counts){for(const kind of ["monitoring","harvest"] as const){const value=agronomyCount(agronomyCopies[locale],kind,count,locale);assert.ok(value.startsWith(new Intl.NumberFormat(locale).format(count)),`${locale}.${kind}.${count}`);assert.doesNotMatch(value,/undefined|null|\{count\}/)}}}});
