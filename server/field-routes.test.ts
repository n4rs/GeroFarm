import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { FieldDto } from "@shared/fields";
import { createApp } from "./app";
import type { FarmRequestContext } from "./farm-context";
import type { FarmHoldingRepository } from "./farm-holdings";
import type { FieldRepository } from "./fields";

const context = { user: { id: "0c9bb34d-acdb-42f0-9918-edeb05a37c9a", email: "owner@example.test", name: "Owner", preferredLocale: "pt-PT", preferences: {}, status: "active", emailVerifiedAt: null, platformRoles: [] }, organization: { id: "18796978-ed75-43f8-95b6-de7515e01d39", name: "Gero QA", slug: "gero-qa", status: "active" }, membership: { role: "owner", status: "active" } } satisfies FarmRequestContext;
const holdings: FarmHoldingRepository = { list: async () => [], create: async () => { throw new Error(); }, update: async () => null };
const geometry = { type: "Polygon" as const, coordinates: [[[-8.01, 39], [-8, 39], [-8, 39.01], [-8.01, 39.01], [-8.01, 39]]] };

test("field routes normalize codes and preserve the tenant repository boundary", async () => {
  const rows: FieldDto[] = [];
  const fields: FieldRepository = { list: async (received) => { assert.equal(received.organization.id, context.organization.id); return rows; }, create: async (_context, input) => { const now = new Date().toISOString(); const row: FieldDto = { id: "e695a185-38a6-4bb0-a8c8-72a8bfd8888f", ...input, usableAreaHa: input.usableAreaHa || 1, totalAreaHa: 1, occupiedAreaHa: 0, freeAreaHa: input.usableAreaHa || 1, status: "active", codeLocked: false, createdAt: now, updatedAt: now }; rows.push(row); return row; }, update: async () => null };
  const server = createServer(createApp({ farmHoldingRepository: holdings, fieldRepository: fields, farmContextResolver: async () => context })); await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try { const address = server.address(); assert(address && typeof address === "object"); const base = `http://127.0.0.1:${address.port}`; const response = await fetch(`${base}/api/farm/fields`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ holdingId: "91cfeb50-bce1-48c3-a9db-723693c88e7b", name: "Norte", code: "t1", geometry }) }); assert.equal(response.status, 201); assert.equal(((await response.json()) as { data: FieldDto }).data.code, "00T1"); assert.equal(((await (await fetch(`${base}/api/farm/fields`)).json()) as { data: FieldDto[] }).data.length, 1); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
