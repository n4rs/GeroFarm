import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { weatherCopies } from "./weather-locales";

test("agronomic weather UI covers exactly the 28 supported locales",()=>{assert.deepEqual(Object.keys(weatherCopies).sort(),[...supportedLocales].sort());for(const locale of supportedLocales){const copy=weatherCopies[locale];assert(copy.title.length>0);assert(copy.stations.length>0);assert(copy.observed.length>0);assert(copy.estimated.length>0)}});
test("Portuguese weather semantics distinguish temporal status and value source",()=>{const copy=weatherCopies["pt-PT"];assert.equal(copy.observed,"Realizado");assert.equal(copy.forecast,"Previsto");assert.equal(copy.measured,"Medido");assert.equal(copy.estimated,"Estimado");assert.match(copy.vegetativeWarning,/nunca/)});
