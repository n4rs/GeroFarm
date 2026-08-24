import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  accumulationStart,
  accumulationWindowStart,
  activeStationCount,
  fieldCentroid,
  weatherCapabilities,
} from "./weather";

test("archived virtual stations preserve history without consuming capacity", () => {
  const base = {
    organizationId: crypto.randomUUID(),
    latitude: 38.7,
    longitude: -9.1,
    elevationM: 50,
    timezone: "Europe/Lisbon",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  assert.equal(
    activeStationCount([
      { ...base, id: crypto.randomUUID(), name: "Ativa", archivedAt: null },
      {
        ...base,
        id: crypto.randomUUID(),
        name: "Histórica",
        archivedAt: "2026-02-01T00:00:00Z",
      },
    ]),
    1,
  );
});

test("accumulations use explicit agronomic lifecycle dates and never infer vegetative start", () => {
  assert.deepEqual(
    accumulationStart({
      plantationKind: "temporary",
      establishment: "sown",
      hasDormancy: false,
      emergenceDate: "2026-03-10",
      sowingDate: "2026-03-01",
    }),
    { date: "2026-03-10", basis: "emergence" },
  );
  assert.deepEqual(
    accumulationStart({
      plantationKind: "temporary",
      establishment: "sown",
      hasDormancy: false,
      sowingDate: "2026-03-01",
    }),
    { date: "2026-03-01", basis: "sowing_fallback" },
  );
  assert.deepEqual(
    accumulationStart({
      plantationKind: "temporary",
      establishment: "transplanted",
      hasDormancy: false,
      transplantDate: "2026-04-15",
    }),
    { date: "2026-04-15", basis: "transplant" },
  );
  assert.deepEqual(
    accumulationStart({
      plantationKind: "permanent",
      establishment: "not_applicable",
      hasDormancy: true,
    }),
    { date: null, basis: "missing_vegetative_start" },
  );
  assert.deepEqual(
    accumulationStart({
      plantationKind: "permanent",
      establishment: "not_applicable",
      hasDormancy: false,
      campaignStartDate: "2026-01-01",
    }),
    { date: "2026-01-01", basis: "campaign_start" },
  );
  assert.equal(accumulationWindowStart("2026-08-24", "30"), "2026-07-26");
  assert.equal(
    accumulationWindowStart("2026-08-24", "custom", "2026-05-01"),
    "2026-05-01",
  );
});

test("field proximity uses a stable polygon centre", () => {
  const centre = fieldCentroid([
    [-9.2, 38.6],
    [-9, 38.6],
    [-9, 38.8],
    [-9.2, 38.8],
    [-9.2, 38.6],
  ]);
  assert(
    centre &&
      Math.abs(centre.longitude + 9.1) < 1e-9 &&
      Math.abs(centre.latitude - 38.7) < 1e-9,
  );
  assert.equal(fieldCentroid([]), null);
});

test("commercial weather levels expose only their contracted depth", () => {
  assert.equal(weatherCapabilities("essential").history, false);
  assert.equal(weatherCapabilities("campaign").campaignProfiles, true);
  assert.equal(
    weatherCapabilities("professional").crossCampaignComparison,
    true,
  );
  assert.equal(weatherCapabilities("custom").export, true);
});

test("GeroFarm weather code contains no local indicator or accumulation algorithm", async () => {
  const sources = await Promise.all([
    readFile(new URL("./weather.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/weather-routes.ts", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../client/src/app/weather/WeatherModule.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const source = sources.join("\n");
  assert.doesNotMatch(
    source,
    /aggregateWeatherIndicators|indicatorInputFromReport|solarRadiationMjM2Day|windSpeed2mMps/u,
  );
  assert.doesNotMatch(source, /pirate\s*weather/iu);
  assert.match(source, /agronomic-accumulation/u);
});
