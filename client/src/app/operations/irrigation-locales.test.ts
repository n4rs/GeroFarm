import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { irrigationCopies } from "./irrigation-locales";

test("irrigation has key parity and non-empty copy in all 28 locales", () => { const keys = Object.keys(irrigationCopies.en).sort(); assert.equal(supportedLocales.length, 28); for (const locale of supportedLocales) { assert.deepEqual(Object.keys(irrigationCopies[locale]).sort(), keys, locale); for (const value of Object.values(irrigationCopies[locale])) assert.ok(value.trim(), locale); } });
test("core irrigation terminology is localized and rejects misleading allocation language", () => { for (const locale of supportedLocales.filter((item) => item !== "en")) for (const key of ["title","undistributed","weekly","performedBySchedule"] as const) assert.notEqual(irrigationCopies[locale][key], irrigationCopies.en[key], `${locale}.${key}`); for (const locale of supportedLocales) assert.doesNotMatch(irrigationCopies[locale].undistributed, /estimated allocation|automatic split|invented/i, locale); });
test("irrigation reuses reviewed localized UI copy instead of English fallback",()=>{for(const locale of supportedLocales.filter((item)=>item!=="en"))for(const key of["description","physicalNotice","duration","system","save","cancel","noData","loadError"]as const)assert.notEqual(irrigationCopies[locale][key],irrigationCopies.en[key],`${locale}.${key}`)});
