import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { lifecycleCopies } from "./lifecycle-locales.generated";

test("crop lifecycle has complete reviewed messages in all 28 locales",()=>{const keys=Object.keys(lifecycleCopies.en).sort();assert.equal(Object.keys(lifecycleCopies).length,28);for(const locale of supportedLocales){assert.deepEqual(Object.keys(lifecycleCopies[locale]).sort(),keys,locale);assert.match(lifecycleCopies[locale].addPeriod,/\{period\}/,locale);assert.match(lifecycleCopies[locale].closePeriod,/\{period\}/,locale);for(const value of Object.values(lifecycleCopies[locale]))assert.ok(value.trim(),locale)}});
test("reviewed lifecycle terms exclude known literal machine mistranslations",()=>{const forbidden=/^(Temporäre Ernte|Kırpma rotasyonu|Rajausjakso|Păderea|ברך|Fallow)$/u;for(const locale of supportedLocales.filter((item)=>item!=="en")){for(const key of ["plantations","fallow","rotation","temporary","cycle"] as const)assert.doesNotMatch(lifecycleCopies[locale][key],forbidden,`${locale}.${key}`)}});
