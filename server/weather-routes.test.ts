import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "./app";
import type { CoreAccess } from "./gero-core-client";
import type { FarmRequestContext } from "./farm-context";
import type { WeatherBaseSeries } from "@shared/weather";
import type { WeatherStore } from "./weather-store";

const organizationId = "18796978-ed75-43f8-95b6-de7515e01d39";
const access = (level: "essential" | "campaign"): CoreAccess => ({
  organization: {
    id: organizationId,
    name: "Gero QA",
    slug: "gero-qa",
    status: "active",
  },
  membership: { role: "owner", status: "active" },
  application: {
    id: crypto.randomUUID(),
    code: "farm",
    name: "GeroFarm",
    slug: "gerofarm",
    status: "active",
    url: null,
  },
  applicationMembership: {
    profile: "owner",
    status: "active",
    expiresAt: null,
    temporary: false,
    permissions: ["*"],
    permissionOverrides: { allow: [], deny: [] },
  },
  access: {
    allowed: true,
    reason: null,
    evaluatedAt: new Date().toISOString(),
    mode: "full",
    writeAllowed: true,
    exportAllowed: true,
    graceEndsAt: null,
  },
  subscription: null,
  entitlements: {
    features: { agronomicWeather: level },
    limits: {},
    addons: [],
  },
  onboarding: null,
});
const context: FarmRequestContext = {
  user: {
    id: "0c9bb34d-acdb-42f0-9918-edeb05a37c9a",
    email: "owner@example.test",
    name: "Owner",
    preferredLocale: "pt-PT",
    preferences: {},
    status: "active",
    emailVerifiedAt: null,
    platformRoles: [],
  },
  organization: {
    id: organizationId,
    name: "Gero QA",
    slug: "gero-qa",
    status: "active",
  },
  membership: { role: "owner", status: "active" },
  access: access("campaign"),
};

const plantationId = "44444444-4444-4444-8444-444444444444";
const campaignId = "55555555-5555-4555-8555-555555555555";
const persistedSeries = (): WeatherBaseSeries => ({
  contractVersion: "2",
  subject: { subjectType: "plantation", subjectId: plantationId },
  interval: { from: "2026-08-25", to: "2026-08-25", maximumDays: 366 },
  page: { from: "2026-08-25", to: "2026-08-25", sizeDays: 1, nextCursor: null },
  timezone: "Europe/Lisbon",
  units: "metric",
  hourly: [],
  daily: [],
  stationPeriods: [],
  coverage: { requestedDays: 1, daysWithHourlyData: 0, daysWithDailyData: 0, requestedHours: 24, availableHours: 0, complete: true, gaps: [] },
  meta: { provider: "persisted-provider-independent", fetchedAt: "2026-08-25T09:00:00Z", cached: true, stale: false, cache: { status: "fresh", requests: 0, hits: 1, misses: 0 } },
});

const weatherStore = (series: WeatherBaseSeries | null, writes: { persist: number; result: number }): WeatherStore => ({
  completeSeries: async () => series,
  persistedSeries: async () => series,
  persistSeries: async () => { writes.persist += 1; },
  profile: async () => null,
  saveProfile: async () => { throw new Error("unexpected profile write"); },
  saveResult: async () => { writes.result += 1; },
});

async function withServer(run: (base: string) => Promise<void>, selectedContext = context, store?: WeatherStore) {
  const server = createServer(
    createApp({ farmContextResolver: async () => selectedContext, weatherStore: store }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("weather routes are a tenant-safe authenticated proxy for the Core v2 contract", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{
    url: string;
    method: string;
    cookie: string;
    csrf: string;
    body?: string;
  }> = [];
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const url = String(input);
    const method = init?.method || "GET";
    calls.push({
      url,
      method,
      cookie: headers.get("cookie") || "",
      csrf: headers.get("x-csrf-token") || "",
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const data =
      method === "POST"
        ? {
            id: crypto.randomUUID(),
            organizationId,
            name: "Norte",
            latitude: 38.7,
            longitude: -9.1,
            elevationM: 80,
            timezone: "Europe/Lisbon",
            archivedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : [];
    return new Response(JSON.stringify({ data }), {
      status: method === "POST" ? 201 : 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    await withServer(async (base) => {
      const listed = await originalFetch(`${base}/api/weather/stations`, {
        headers: { cookie: "gero_session=session; unrelated=value" },
      });
      assert.equal(listed.status, 200);
      const created = await originalFetch(`${base}/api/weather/stations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "gero_session=session; gero_csrf=csrf-token",
        },
        body: JSON.stringify({
          name: "Norte",
          latitude: 38.7,
          longitude: -9.1,
          elevationM: 80,
          timezone: "Europe/Lisbon",
        }),
      });
      assert.equal(created.status, 201);
    });
    assert.match(
      calls[0].url,
      new RegExp(
        `/organizations/${organizationId}/applications/farm/weather/stations$`,
      ),
    );
    assert.equal(calls[0].cookie, "gero_session=session");
    assert.equal(calls[1].cookie, "gero_session=session; gero_csrf=csrf-token");
    assert.equal(calls[1].csrf, "csrf-token");
    assert.equal(JSON.parse(calls[1].body!).timezone, "Europe/Lisbon");
    assert.equal(
      calls.every((call) => !/pirate/i.test(call.url)),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("agronomic API derives locally from persisted base series and records its audit result",async()=>{const plantationId="44444444-4444-4444-8444-444444444444",campaignId="55555555-5555-4555-8555-555555555555",station={id:"66666666-6666-4666-8666-666666666666",organizationId,name:"Local",latitude:38,longitude:-9,elevationM:80,timezone:"Europe/Lisbon",archivedAt:null,createdAt:"2025-01-01T00:00:00Z",updatedAt:"2025-01-01T00:00:00Z"},assignment={id:"77777777-7777-4777-8777-777777777777",stationId:station.id,subjectType:"plantation" as const,subjectId:plantationId,effectiveFrom:"2025-01-01T00:00:00Z",effectiveTo:null},series:WeatherBaseSeries={contractVersion:"2",subject:{subjectType:"plantation",subjectId:plantationId},interval:{from:"2025-08-01",to:"2025-08-01",maximumDays:366},page:{from:"2025-08-01",to:"2025-08-01",sizeDays:1,nextCursor:null},timezone:"Europe/Lisbon",units:"metric",hourly:[],daily:[],stationPeriods:[{from:"2025-08-01",to:"2025-08-01",station,assignment}],coverage:{requestedDays:1,daysWithHourlyData:0,daysWithDailyData:0,requestedHours:24,availableHours:0,complete:false,gaps:[{from:"2025-08-01",to:"2025-08-01",reason:"hourly_data_unavailable"}]},meta:{provider:"persisted-provider-independent",fetchedAt:"2025-08-02T00:00:00Z",cached:true,stale:false,cache:{status:"fresh",requests:0,hits:1,misses:0}}};let saved=false;const store:WeatherStore={completeSeries:async()=>series,persistSeries:async()=>{throw new Error("must reuse history")},profile:async()=>null,saveProfile:async()=>{throw new Error("unused")},saveResult:async()=>{saved=true}};const server=createServer(createApp({farmContextResolver:async()=>context,weatherStore:store}));await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));try{const address=server.address();assert(address&&typeof address==="object");const response=await fetch(`http://127.0.0.1:${address.port}/api/weather/subjects/plantation/${plantationId}/agronomic-series`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({from:"2025-08-01",to:"2025-08-01",campaignId})});assert.equal(response.status,200);const body=await response.json() as {data:{metrics:{et0:{version:string;state:string}}}};assert.equal(body.data.metrics.et0.version,"gerofarm-agronomy-1.0.0");assert.equal(body.data.metrics.et0.state,"insufficient_data");assert.equal(saved,true)}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}});

test("read-only weather GET uses persisted series without Core or writes", async () => {
  const originalFetch = globalThis.fetch, writes = { persist: 0, result: 0 };
  let coreCalls = 0;
  globalThis.fetch = async () => { coreCalls += 1; throw new Error("Core must not be called by persisted GET"); };
  try {
    await withServer(async (base) => {
      for (const suffix of ["conditions", "agronomic-series"]) {
        const response = await originalFetch(`${base}/api/weather/subjects/plantation/${plantationId}/${suffix}?from=2026-08-25&to=2026-08-25&campaignId=${campaignId}`);
        assert.equal(response.status, 200);
        const body = await response.json() as { data: unknown; state: string };
        assert.notEqual(body.data, null);
        assert.equal(body.state, "persisted");
      }
    }, context, weatherStore(persistedSeries(), writes));
    assert.deepEqual(writes, { persist: 0, result: 0 });
    assert.equal(coreCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("read-only weather GET reports missing persisted data without Core or writes", async () => {
  const originalFetch = globalThis.fetch, writes = { persist: 0, result: 0 };
  let coreCalls = 0;
  globalThis.fetch = async () => { coreCalls += 1; throw new Error("Core must not be called by empty GET"); };
  try {
    await withServer(async (base) => {
      for (const suffix of ["conditions", "agronomic-series"]) {
        const response = await originalFetch(`${base}/api/weather/subjects/plantation/${plantationId}/${suffix}?from=2026-08-25&to=2026-08-25`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { data: null, state: "not_persisted" });
      }
    }, context, weatherStore(null, writes));
    assert.deepEqual(writes, { persist: 0, result: 0 });
    assert.equal(coreCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("weather conditions reject invalid plantation identifiers before contacting Core", async () =>
  withServer(async (base) => {
    const response = await fetch(`${base}/api/weather/subjects/plantation/not-a-uuid/conditions`, {
      method: "POST", headers: { "content-type": "application/json", cookie: "gero_session=session" },
      body: JSON.stringify({ from: "2026-08-24", to: "2026-08-24" }),
    });
    assert.equal(response.status, 400);
    assert.equal(
      ((await response.json()) as { code: string }).code,
      "VALIDATION_ERROR",
    );
  }));

test("essential weather level blocks history and agronomic accumulation", async () => {
  const essential = { ...context, access: access("essential") };
  const server = createServer(
    createApp({ farmContextResolver: async () => essential }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const base = `http://127.0.0.1:${address.port}`;
    for (const [path, body] of [
      ["/api/weather/subjects/plantation/44444444-4444-4444-8444-444444444444/conditions", { from: "2026-08-23", to: "2026-08-24" }],
      ["/api/weather/subjects/plantation/44444444-4444-4444-8444-444444444444/agronomic-series", { from: "2026-08-01", to: "2026-08-24" }],
    ] as const) {
      const response = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      assert.equal(response.status, 403);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "WEATHER_LEVEL_REQUIRED",
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("weather mutations enforce permissions and read-only access locally", async () => {
  const restrictedAccess = access("campaign");
  restrictedAccess.access = { ...restrictedAccess.access, mode: "read_only", writeAllowed: false };
  restrictedAccess.applicationMembership.permissions = ["farm.view"];
  const restricted = { ...context, access: restrictedAccess };
  const originalFetch = globalThis.fetch, writes = { persist: 0, result: 0 };
  let coreCalls = 0;
  globalThis.fetch = async () => { coreCalls += 1; throw new Error("Core must not be called after a local read-only rejection"); };
  try {
    await withServer(async (base) => {
      const requests: Array<[string, unknown]> = [
        ["/api/weather/stations", { name: "Norte", latitude: 38.7, longitude: -9.1, elevationM: 80, timezone: "Europe/Lisbon" }],
        [`/api/weather/subjects/plantation/${plantationId}/conditions`, { from: "2026-08-25", to: "2026-08-25" }],
        [`/api/weather/subjects/plantation/${plantationId}/agronomic-series`, { from: "2026-08-25", to: "2026-08-25", campaignId }],
      ];
      for (const [path, body] of requests) {
        const response = await originalFetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        assert.equal(response.status, 403, path);
        assert.equal(((await response.json()) as { code: string }).code, "ACCESS_READ_ONLY", path);
      }
    }, restricted, weatherStore(persistedSeries(), writes));
    assert.deepEqual(writes, { persist: 0, result: 0 });
    assert.equal(coreCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("agronomic profile identifiers are UUIDs before persistence", async () => {
  let persisted = false;
  const store = { saveProfile: async () => { persisted = true; return {} as never; } } as unknown as WeatherStore;
  const server = createServer(createApp({ farmContextResolver: async () => context, weatherStore: store }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address(); assert(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/weather/campaigns/not-a-uuid/agronomic-profiles`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 400);
    assert.equal(persisted, false);
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
