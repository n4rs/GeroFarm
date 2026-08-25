import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the territorial flow exposes field creation beside an existing holding", async () => {
  const source = await readFile(new URL("./farm/FarmHoldingsModule.tsx", import.meta.url), "utf8");
  assert.match(source, /const headingAction = tab === "fields" \|\| activeHoldings\.length/u);
  assert.match(source, /className="holding-add-field"[\s\S]{0,180}\{fieldCopy\.add\}/u);
  assert.match(source, /disabled=\{!canWrite \|\| holding\.status !== "active"\}/u);
  assert.match(source, /setTab\("fields"\)[\s\S]{0,100}setEditingField\(null\)/u);
});

test("the irrigation flow exposes the current creation action in the heading and sector empty state", async () => {
  const source = await readFile(new URL("./operations/IrrigationPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /className="irrigation-heading-actions"[\s\S]{0,300}setDialog\(tab\)/u);
  assert.match(source, /className="irrigation-empty"[\s\S]{0,250}setDialog\("sectors"\)/u);
  assert.match(source, /tab === "sectors" \? !holdings\.length \|\| !fields\.length/u);
});

test("station creation fits active field polygons and selects coordinates on the map", async () => {
  const [moduleSource, mapSource] = await Promise.all([
    readFile(new URL("./weather/WeatherModule.tsx", import.meta.url), "utf8"),
    readFile(new URL("./weather/WeatherStationMap.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(moduleSource, /<WeatherStationMap fields=\{fields\} coordinates=\{coordinates\} onChange=\{setCoordinates\}/u);
  assert.match(moduleSource, /value=\{latitude\}[\s\S]{0,120}setLatitude/u);
  assert.match(moduleSource, /value=\{longitude\}[\s\S]{0,120}setLongitude/u);
  assert.match(mapSource, /field\.status === "active"/u);
  assert.match(mapSource, /map\.fitBounds\(bounds/u);
  assert.match(mapSource, /map\.on\("click"[\s\S]{0,180}latitude: latlng\.lat, longitude: latlng\.lng/u);
  assert.match(mapSource, /draggable: true/u);
});
