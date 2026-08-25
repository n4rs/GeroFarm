import assert from "node:assert/strict";
import test from "node:test";
import { assertAccess, assertNotebookExport, EntitlementError, lockCapacity, requestAccessOptions } from "./entitlements";
import type { FarmRequestContext } from "./farm-context";

function context(feature: string | boolean | null = true): FarmRequestContext {
  const organization = { id: "11111111-1111-4111-8111-111111111111", name: "Farm", slug: "farm", status: "active" };
  const membership = { role: "owner", status: "active" };
  return {
    user: { id: "22222222-2222-4222-8222-222222222222", email: "a@b.test", name: "A", preferredLocale: "pt-PT", preferences: {}, status: "active", emailVerifiedAt: null, platformRoles: [] }, organization, membership,
    access: {
      organization, membership,
      applicationMembership: { profile: "owner", status: "active", expiresAt: null, temporary: false, permissions: ["*"], permissionOverrides: { allow: [], deny: [] } },
      application: { id: "33333333-3333-4333-8333-333333333333", code: "farm", name: "GeroFarm", slug: "gerofarm", status: "active", url: null },
      access: { allowed: true, reason: null, evaluatedAt: new Date().toISOString(), mode: "full", writeAllowed: true, exportAllowed: true, graceEndsAt: null },
      subscription: { id: "44444444-4444-4444-8444-444444444444", status: "trialing", startsAt: "2026-01-01", trialEndsAt: "2026-09-01", renewsAt: null, endsAt: null, canceledAt: null, autoRenew: true, plan: { code: "start", name: "Start", status: "active" } },
      entitlements: { features: { privacyByDesign: true, fieldNotebookExport: feature }, limits: { activePlots: 5 }, addons: [] }, onboarding: null,
    },
  };
}

test("direct API feature and permission gates fail closed", () => {
  const denied = context(); denied.access!.entitlements.features.inventory = false;
  assert.throws(() => assertAccess(denied, { feature: "inventory", permission: "inventory.manage", write: true }), (error: unknown) => error instanceof EntitlementError && error.code === "FEATURE_NOT_ENTITLED");
  denied.access!.applicationMembership.permissions = [];
  assert.throws(() => assertAccess(denied, { permission: "farm.view" }), (error: unknown) => error instanceof EntitlementError && error.code === "PERMISSION_DENIED");
});
test("Start trial never authorizes a real field-notebook export", () => { assert.throws(() => assertNotebookExport(context("after_trial")), (error: unknown) => error instanceof EntitlementError && error.code === "FEATURE_DEMO_ONLY"); assert.doesNotThrow(() => assertNotebookExport(context(true))); });
test("capacity release routes remain usable in read-only mode", () => { assert.equal(requestAccessOptions("PATCH", "/fields/id", {}, { status: "inactive" }).write, false); assert.equal(requestAccessOptions("POST", "/plantations/id/uproot").write, false); assert.equal(requestAccessOptions("POST", "/fields", {}, {}).write, true); });
test("notebook downloads use export access without requiring write access", () => { assert.deepEqual(requestAccessOptions("POST", "/field-notebooks/xlsx"), { permission: "field_notebook.export", export: true, write: false }); assert.deepEqual(requestAccessOptions("GET", "/field-notebooks/id/pdf"), { permission: "field_notebook.export", export: true, write: false }); });
test("concurrent quota mutations acquire a tenant advisory transaction lock", async () => { const calls: unknown[] = []; await lockCapacity({ execute: async (value: unknown) => { calls.push(value); } } as never, "11111111-1111-4111-8111-111111111111"); assert.equal(calls.length, 1); });
