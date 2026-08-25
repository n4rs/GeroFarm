import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { idempotencyMiddleware, requestFingerprint, type IdempotencyStore, type Reservation } from "./idempotency";

type Entry = { organizationId: string; method: string; path: string; requestHash: string; expiresAt: Date; response?: { status: number; headers: Record<string, string>; body: unknown } };

function memoryStore(): IdempotencyStore {
  const entries = new Map<string, Entry>();
  return {
    async reserve(organizationId, key, request, now): Promise<Reservation> {
      for (const [entryKey, entry] of entries) if (entry.organizationId === organizationId && entry.expiresAt < now) entries.delete(entryKey);
      const entryKey = `${organizationId}:${key}`, existing = entries.get(entryKey);
      if (!existing) { entries.set(entryKey, { organizationId, ...request, expiresAt: new Date(now.getTime() + 86_400_000) }); return { state: "new" }; }
      if (existing.method !== request.method || existing.path !== request.path || existing.requestHash !== request.requestHash) return { state: "mismatch" };
      return existing.response ? { state: "completed", ...existing.response } : { state: "pending" };
    },
    async complete(organizationId, key, requestHash, response) {
      const existing = entries.get(`${organizationId}:${key}`);
      if (existing?.requestHash === requestHash) existing.response = response;
    },
    async release(organizationId, key, requestHash) {
      const entryKey = `${organizationId}:${key}`, existing = entries.get(entryKey);
      if (existing?.requestHash === requestHash && !existing.response) entries.delete(entryKey);
    },
  };
}

async function withServer(handler: express.RequestHandler, run: (base: string) => Promise<void>) {
  const app = express(), store = memoryStore();
  app.use(express.json());
  app.use(idempotencyMiddleware(store, async (req) => ({ organization: { id: req.get("x-org") || "org-a" } } as never)));
  app.post("/api/farm/operations", handler);
  app.post("/api/auth/logout", (_req, res) => res.status(204).end());
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try { await run(`http://127.0.0.1:${port}`); } finally { server.close(); await once(server, "close"); }
}

const headers = { "content-type": "application/json", "idempotency-key": "abcdefgh-1234" };

test("idempotency fingerprints are stable across object property order", () => {
  const left = { method: "POST", originalUrl: "/api/farm/operations", body: { b: 2, a: { d: 4, c: 3 } } };
  const right = { method: "POST", originalUrl: "/api/farm/operations", body: { a: { c: 3, d: 4 }, b: 2 } };
  assert.equal(requestFingerprint(left), requestFingerprint(right));
});

test("production requires a key only for explicitly covered JSON mutations", async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = "production";
  try {
    await withServer((_req, res) => { res.status(201).json({ data: "created" }); }, async (base) => {
      const missing = await fetch(`${base}/api/farm/operations`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      assert.equal(missing.status, 400);
      assert.equal((await missing.json() as { code: string }).code, "IDEMPOTENCY_KEY_REQUIRED");
      const logout = await fetch(`${base}/api/auth/logout`, { method: "POST" });
      assert.equal(logout.status, 204);
    });
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test("completed responses replay the original body, status and safe headers", async () => {
  let executions = 0;
  await withServer((_req, res) => { executions += 1; res.status(201).set({ "cache-control": "private, no-store", location: "/api/farm/operations/1", "set-cookie": "secret=never-store" }).json({ data: { id: 1 } }); }, async (base) => {
    const first = await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" });
    const replay = await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" });
    assert.equal(first.status, 201); assert.equal(replay.status, 201); assert.equal(executions, 1);
    assert.deepEqual(await replay.json(), { data: { id: 1 } });
    assert.equal(replay.headers.get("location"), "/api/farm/operations/1");
    assert.equal(replay.headers.get("cache-control"), "private, no-store");
    assert.equal(replay.headers.get("idempotency-replayed"), "true");
    assert.equal(replay.headers.get("set-cookie"), null);
  });
});

test("reusing a key with a different request hash is rejected", async () => {
  await withServer((_req, res) => { res.status(201).json({ ok: true }); }, async (base) => {
    assert.equal((await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: JSON.stringify({ value: 1 }) })).status, 201);
    const mismatch = await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: JSON.stringify({ value: 2 }) });
    assert.equal(mismatch.status, 409);
    assert.equal((await mismatch.json() as { code: string }).code, "IDEMPOTENCY_KEY_REUSED");
  });
});

test("a concurrent duplicate is reported as in progress and executes once", async () => {
  let entered!: () => void, release!: () => void, executions = 0;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await withServer(async (_req, res) => { executions += 1; entered(); await gate; res.status(201).json({ ok: true }); }, async (base) => {
    const first = fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" });
    await started;
    const concurrent = await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" });
    assert.equal(concurrent.status, 409);
    assert.equal(concurrent.headers.get("retry-after"), "1");
    assert.equal((await concurrent.json() as { code: string }).code, "IDEMPOTENCY_REQUEST_IN_PROGRESS");
    release(); assert.equal((await first).status, 201); assert.equal(executions, 1);
  });
});

test("server failures release the reservation for a safe transactional retry", async () => {
  let executions = 0;
  await withServer((_req, res) => { executions += 1; if (executions === 1) res.status(503).json({ code: "ROLLED_BACK" }); else res.status(201).json({ ok: true }); }, async (base) => {
    assert.equal((await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" })).status, 503);
    assert.equal((await fetch(`${base}/api/farm/operations`, { method: "POST", headers, body: "{}" })).status, 201);
    assert.equal(executions, 2);
  });
});

test("the same key is isolated by organization", async () => {
  let executions = 0;
  await withServer((_req, res) => { executions += 1; res.status(201).json({ execution: executions }); }, async (base) => {
    const forOrg = (organization: string) => fetch(`${base}/api/farm/operations`, { method: "POST", headers: { ...headers, "x-org": organization }, body: "{}" });
    assert.equal((await forOrg("org-a")).status, 201);
    assert.equal((await forOrg("org-b")).status, 201);
    assert.equal(executions, 2);
  });
});
