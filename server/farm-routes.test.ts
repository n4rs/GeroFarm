import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { FarmHoldingDto } from "@shared/farm-holdings";
import { createApp } from "./app";
import type { FarmRequestContext } from "./farm-context";
import type { FarmHoldingRepository } from "./farm-holdings";

const context: FarmRequestContext = {
  user: { id: "0c9bb34d-acdb-42f0-9918-edeb05a37c9a", email: "owner@example.test", name: "Owner", preferredLocale: "pt-PT", preferences: {}, status: "active", emailVerifiedAt: null, platformRoles: [] },
  organization: { id: "18796978-ed75-43f8-95b6-de7515e01d39", name: "Gero QA", slug: "gero-qa", status: "active" },
  membership: { role: "owner", status: "active" },
};

function repository(): FarmHoldingRepository {
  const rows: FarmHoldingDto[] = [];
  return {
    async list(received) { assert.equal(received.organization.id, context.organization.id); return rows; },
    async create(received, input) { assert.equal(received.user.id, context.user.id); const now = new Date().toISOString(); const row: FarmHoldingDto = { id: "91cfeb50-bce1-48c3-a9db-723693c88e7b", ...input, status: "active", createdAt: now, updatedAt: now }; rows.push(row); return row; },
    async update(_received, id, input) { const row = rows.find((candidate) => candidate.id === id); if (!row) return null; Object.assign(row, input); return row; },
  };
}

async function withServer(run: (base: string) => Promise<void>) {
  const server = createServer(createApp({ farmHoldingRepository: repository(), farmContextResolver: async () => context }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { const address = server.address(); assert(address && typeof address === "object"); await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("creates and lists a tenant-scoped agricultural holding", async () => withServer(async (base) => {
  const created = await fetch(`${base}/api/farm/holdings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Monte Claro", code: "mc-01", timezone: "Europe/Lisbon" }) });
  assert.equal(created.status, 201);
  assert.equal(((await created.json()) as { data: FarmHoldingDto }).data.code, "MC01");
  const listed = await fetch(`${base}/api/farm/holdings`);
  assert.equal(listed.status, 200);
  assert.equal(((await listed.json()) as { data: FarmHoldingDto[] }).data.length, 1);
  assert.equal(listed.headers.get("cache-control"), "no-store");
}));

test("rejects invalid holdings and returns a stable missing-record code", async () => withServer(async (base) => {
  const invalid = await fetch(`${base}/api/farm/holdings`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "x", code: "!", timezone: "Nowhere/Unknown" }) });
  assert.equal(invalid.status, 400);
  const missing = await fetch(`${base}/api/farm/holdings/91cfeb50-bce1-48c3-a9db-723693c88e7b`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "inactive" }) });
  assert.equal(missing.status, 404);
  assert.equal(((await missing.json()) as { code: string }).code, "FARM_HOLDING_NOT_FOUND");
}));
