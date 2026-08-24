import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "./app";
import type { CoreAccess } from "./gero-core-client";
import type { FarmRequestContext } from "./farm-context";

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

async function withServer(run: (base: string) => Promise<void>) {
  const server = createServer(
    createApp({ farmContextResolver: async () => context }),
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
      const accumulated = await originalFetch(
        `${base}/api/weather/subjects/plantation/plantation-2026/agronomic-accumulation?from=2026-08-01&to=2026-08-24&campaignId=campaign-2026`,
        { headers: { cookie: "gero_session=session" } },
      );
      assert.equal(accumulated.status, 200);
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
    assert.match(
      calls[2].url,
      /subjects\/plantation\/plantation-2026\/agronomic-accumulation\?from=2026-08-01&to=2026-08-24&campaignId=campaign-2026$/,
    );
    assert.equal(calls[2].method, "GET");
    assert.equal(
      calls.every((call) => !/pirate/i.test(call.url)),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("weather proxy rejects invalid station identifiers before contacting Core", async () =>
  withServer(async (base) => {
    const response = await fetch(
      `${base}/api/weather/stations/not-a-uuid/report`,
      { headers: { cookie: "gero_session=session" } },
    );
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
    for (const path of [
      "/api/weather/historical?latitude=38&longitude=-9&at=2026-08-24T12%3A00%3A00.000Z",
      "/api/weather/subjects/plantation/plantation-2026/agronomic-accumulation?from=2026-08-01&to=2026-08-24",
    ]) {
      const response = await fetch(`${base}${path}`);
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
