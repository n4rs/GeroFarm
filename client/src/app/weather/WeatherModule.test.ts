import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agronomic weather requires explicit plantation and cultural period when several exist",async()=>{const source=await readFile(new URL("./WeatherModule.tsx",import.meta.url),"utf8");assert.match(source,/active\.length===1\?active\[0\]\.id:""/u);assert.match(source,/plantations\.length===1\?plantations\[0\]:undefined/u);assert.match(source,/relevantPeriods\.length === 1 \? relevantPeriods\[0\]\.id : ""/u);assert.match(source,/relevantPeriods\.length > 0 && !campaign/u);assert.match(source,/aria-label=\{t\.campaign\}/u);assert.doesNotMatch(source,/periods\.find\([\s\S]{0,150}status === "active"/u)});

test("weather UI exposes local audit state and uses only locally persisted series views",async()=>{const source=await readFile(new URL("./WeatherModule.tsx",import.meta.url),"utf8");assert.match(source,/agronomic-series/u);assert.match(source,/\/conditions\?from=/u);assert.match(source,/item\.inputHash/u);assert.match(source,/item\.state !== "available"/u);assert.doesNotMatch(source,/agronomic-accumulation|pending-core-weather|\/report/u)});
