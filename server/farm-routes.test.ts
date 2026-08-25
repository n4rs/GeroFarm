import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { FarmHoldingDto } from "@shared/farm-holdings";
import { createApp } from "./app";
import type { FarmRequestContext } from "./farm-context";
import type { FarmHoldingRepository } from "./farm-holdings";
import type { FertilizationPlanRepository } from "./fertilization-plans";
import type { OperationRepository } from "./operations";
import { emptyNutrients, type FertilizationPlanDto } from "@shared/fertilization-plans";

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

test("operation catalogue API lists and deactivates an organization item without deletion", async () => {
  const item = { id: "0c88e291-b910-43de-8a1e-753b77a88637", kind: "soil_action" as const, label: "Mobilização localizada", status: "active" as const, createdAt: new Date().toISOString() };
  const operations:OperationRepository = { list: async () => [], catalog: async () => [item], createCatalogItem:async()=>item, setCatalogItemActive: async (_context: FarmRequestContext, id: string, active: boolean) => id === item.id ? { ...item, status: active ? "active" as const : "inactive" as const } : null, create:async()=>({} as never), void:async()=>null };
  const server = createServer(createApp({ farmHoldingRepository: repository(), farmContextResolver: async () => context, operationRepository: operations }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address=server.address();assert(address&&typeof address==="object");const base=`http://127.0.0.1:${address.port}`;
    const listed=await fetch(`${base}/api/farm/operation-catalog`);assert.equal(listed.status,200);assert.equal((await listed.json() as {data:unknown[]}).data.length,1);
    const created=await fetch(`${base}/api/farm/operation-catalog`,{method:"POST",headers:{"content-type":"application/json",origin:base},body:JSON.stringify({kind:"soil_action",label:"Mobilização localizada"})});assert.equal(created.status,201);
    const changed=await fetch(`${base}/api/farm/operation-catalog/${item.id}`,{method:"PATCH",headers:{"content-type":"application/json",origin:base},body:JSON.stringify({active:false})});
    assert.equal(changed.status,200);assert.equal((await changed.json() as {data:{status:string}}).data.status,"inactive");
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});

test("fertilization plan routes create a draft and explicitly put it into force", async () => {
  const rows: FertilizationPlanDto[] = [];
  const plans: FertilizationPlanRepository = {
    async list() { return rows; },
    async create(_received, input) { const row: FertilizationPlanDto = { id: "71ae85bb-6242-4dc2-83b6-086a6d46f3f0", ...input, version: 1, status: "draft", createdAt: new Date().toISOString(), fields: input.fields.map((field) => ({ id: crypto.randomUUID(), ...field, deliveredKg: emptyNutrients(), deliveredKgHa: emptyNutrients(), plannedKgHa: emptyNutrients(), plannedBalanceKgHa: emptyNutrients(), balanceKgHa: field.objectivesKgHa, unknownCompositionOperationCount: 0, operationCount: 0, actualIrrigationM3Ha: 0, irrigationNitrateKgHa: 0, irrigationOperationCount: 0, warnings: [] })) }; rows.push(row); return row; },
    async activate(_received, id) { const row = rows.find((item) => item.id === id); if (!row) return null; row.status = "in_force"; return row; },
  };
  const server = createServer(createApp({ farmHoldingRepository: repository(), farmContextResolver: async () => context, fertilizationPlanRepository: plans }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address(); assert(address && typeof address === "object"); const base = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${base}/api/farm/fertilization-plans`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Plano 2026", cultureId: "pt-drap-001", startsOn: "2026-01-01", endsOn: "2026-12-31", fields: [{ fieldId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", targetType: "next_planting", targetLabel: "Próxima plantação", areaHa: 2, objectivesKgHa: { nTotal: 80, p2o5: 40, k2o: 90, cao: 0, mgo: 0, so3: 0 } }] }) });
    assert.equal(response.status, 201);
    const created = (await response.json() as { data: FertilizationPlanDto }).data;
    assert.equal(created.status, "draft");
    const activated = await fetch(`${base}/api/farm/fertilization-plans/${created.id}/activate`, { method: "POST" });
    assert.equal(activated.status, 200);
    assert.equal((await activated.json() as { data: FertilizationPlanDto }).data.status, "in_force");
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
