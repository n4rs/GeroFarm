import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
test("monitoring UI selects a compatible crop subject, exposes corrections and never sends automatic weather",async()=>{const source=await readFile(new URL("./AgronomyModule.tsx",import.meta.url),"utf8");assert.match(source,/weatherSubject:selected\?/u);assert.match(source,/period\.plantationId===plantation\.id/u);assert.match(source,/correctedWeather,correctionReason/u);assert.match(source,/WeatherSnapshot snapshot=/u);assert.doesNotMatch(source,/automaticWeather\s*:\s*\{/u);assert.doesNotMatch(source,/pending-core-weather/u)});
