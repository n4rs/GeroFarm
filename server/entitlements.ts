import { and, eq, sql } from "drizzle-orm";
import { farmFields, plantations } from "@shared/schema";
import { farmLimitKeys, limitTransitionAllowed, numericLimit, type EntitlementSummary, type FarmFeatureKey, type FarmLimitKey, type FarmLimits, type FarmUsage } from "@shared/entitlements";
import type { FieldPolygon } from "@shared/fields";
import type { FarmDatabase, FarmTransaction } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";
import { polygonUnionAreaHa } from "./field-geometry";

export class EntitlementError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details?: Record<string, unknown>) { super(code); }
}

export function hasPermission(context: FarmRequestContext, permission: string) {
  const permissions = context.access?.applicationMembership.permissions;
  return !permissions || permissions.includes("*") || permissions.includes(permission);
}

export function assertAccess(context: FarmRequestContext, options: { permission?: string | string[]; feature?: FarmFeatureKey; write?: boolean; export?: boolean } = {}) {
  const access = context.access;
  if (!access) return;
  if (!access.access.allowed || access.access.mode === "denied") throw new EntitlementError(403, "ACCESS_DENIED");
  if (options.write && !access.access.writeAllowed) throw new EntitlementError(403, "ACCESS_READ_ONLY", { mode: access.access.mode, graceEndsAt: access.access.graceEndsAt });
  if (options.export && !access.access.exportAllowed) throw new EntitlementError(403, "EXPORT_NOT_ALLOWED", { mode: access.access.mode });
  const required = options.permission ? (Array.isArray(options.permission) ? options.permission : [options.permission]) : [];
  if (required.length && !required.some((permission) => hasPermission(context, permission))) throw new EntitlementError(403, "PERMISSION_DENIED", { permission: required.join("|") });
  if (options.feature) {
    const value = access.entitlements.features[options.feature];
    if (value === false || value === null || value === undefined) throw new EntitlementError(403, "FEATURE_NOT_ENTITLED", { feature: options.feature });
  }
}

export function assertNotebookExport(context: FarmRequestContext) {
  assertAccess(context, { permission: "field_notebook.export", export: true });
  const value = context.access?.entitlements.features.fieldNotebookExport;
  if (value === "after_trial") throw new EntitlementError(403, "FEATURE_DEMO_ONLY", { feature: "fieldNotebookExport" });
  if (context.access && value !== true) throw new EntitlementError(403, "FEATURE_NOT_ENTITLED", { feature: "fieldNotebookExport" });
}

export async function lockCapacity(tx: FarmTransaction, organizationId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))`);
}

async function usageInTransaction(tx: FarmTransaction): Promise<FarmUsage> {
  const [fields, activePlantations] = await Promise.all([
    tx.select({ geometry: farmFields.geometry }).from(farmFields).where(eq(farmFields.status, "active")),
    tx.select({ id: plantations.id }).from(plantations).innerJoin(farmFields, eq(plantations.fieldId, farmFields.id)).where(and(eq(plantations.status, "active"), eq(farmFields.status, "active"))),
  ]);
  return {
    applicationUsers: null,
    activeAreaHectares: Number(polygonUnionAreaHa(fields.map((item) => item.geometry)).toFixed(4)),
    activePlots: fields.length,
    activePlantations: activePlantations.length,
    virtualStations: 0,
  };
}

function limits(context: FarmRequestContext): FarmLimits {
  return Object.fromEntries(farmLimitKeys.map((key) => [key, numericLimit(context.access?.entitlements.limits[key])])) as FarmLimits;
}

export async function entitlementSummary(db: FarmDatabase, context: FarmRequestContext): Promise<EntitlementSummary> {
  const usage = await withOrganizationTransaction(db, context.organization.id, usageInTransaction);
  const access = context.access;
  return {
    plan: access?.subscription ? { code: access.subscription.plan.code, name: access.subscription.plan.name } : null,
    access: access ? { mode: access.access.mode, writeAllowed: access.access.writeAllowed, exportAllowed: access.access.exportAllowed, graceEndsAt: access.access.graceEndsAt } : { mode: "full", writeAllowed: true, exportAllowed: true, graceEndsAt: null },
    features: access?.entitlements.features || {}, limits: limits(context), usage, addons: access?.entitlements.addons || [],
  };
}

function assertTransition(resource: FarmLimitKey, current: number, projected: number, limit: number | null) {
  if (!limitTransitionAllowed(current, projected, limit) && limit !== null) throw new EntitlementError(409, "ENTITLEMENT_LIMIT_REACHED", { resource, usage: current, limit, requested: projected });
}

export async function assertFieldCapacity(tx: FarmTransaction, context: FarmRequestContext, input: { id?: string; geometry: FieldPolygon; active: boolean }) {
  await lockCapacity(tx, context.organization.id);
  const rows = await tx.select({ id: farmFields.id, geometry: farmFields.geometry, status: farmFields.status }).from(farmFields);
  const currentActive = rows.filter((row) => row.status === "active");
  const projectedActive = rows.filter((row) => row.id !== input.id && row.status === "active");
  if (input.active) projectedActive.push({ id: input.id || "new", geometry: input.geometry, status: "active" });
  const currentArea = polygonUnionAreaHa(currentActive.map((row) => row.geometry));
  const projectedArea = polygonUnionAreaHa(projectedActive.map((row) => row.geometry));
  const configured = limits(context);
  assertTransition("activePlots", currentActive.length, projectedActive.length, configured.activePlots);
  assertTransition("activeAreaHectares", currentArea, projectedArea, configured.activeAreaHectares);
}

export async function assertPlantationCapacity(tx: FarmTransaction, context: FarmRequestContext, increase = 1) {
  await lockCapacity(tx, context.organization.id);
  const current = (await tx.select({ id: plantations.id }).from(plantations).innerJoin(farmFields, eq(plantations.fieldId, farmFields.id)).where(and(eq(plantations.status, "active"), eq(farmFields.status, "active")))).length;
  assertTransition("activePlantations", current, current + increase, limits(context).activePlantations);
}

export function requestAccessOptions(method: string, path: string, query: Record<string, unknown> = {}, body: Record<string, unknown> = {}) {
  const write = !["GET", "HEAD", "OPTIONS"].includes(method);
  const releasesCapacity = (method === "PATCH" && path.startsWith("/fields/") && body.status === "inactive") || path.endsWith("/close") || path.endsWith("/uproot") || (method === "DELETE" && path.startsWith("/field-notebooks/"));
  if (path.startsWith("/privacy")) return { permission: write ? "farm.manage" : "farm.view", feature: "privacyByDesign" as const, write };
  if (path === "/economics") return { permission: query.view === "costs" ? "finance.view" : "farm.view", feature: query.view === "costs" ? "costs" as const : "inventory" as const };
  if (path.startsWith("/inventory")) return { permission: "inventory.manage", feature: "inventory" as const, write };
  if (path.startsWith("/costs")) return { permission: write ? "costs.manage" : "finance.view", feature: "costs" as const, write };
  if (path === "/field-notebooks/demo") return { permission: "field_notebook.view" };
  if (path.startsWith("/field-notebooks")) return { permission: write ? "field_notebook.export" : "field_notebook.view", write: write && !path.endsWith("/current") && !releasesCapacity };
  if (path.startsWith("/harvests")) return { permission: write ? "harvests.manage" : "harvests.view", write };
  if (path.startsWith("/monitorings") || path.startsWith("/laboratory") || path === "/agronomy") return { permission: write ? "agronomy.manage" : "farm.view", write };
  if (path === "/operations" && method === "POST") return { permission: ["operations.manage", "operations.create"], write: true };
  if (path.startsWith("/operations") || path.startsWith("/irrigation")) return { permission: write ? "operations.manage" : "operations.view", write };
  if (path.startsWith("/fertilization-plans")) return { permission: write ? "plans.manage" : "plans.view", write };
  if (path.startsWith("/fields") || path.startsWith("/holdings") || path.startsWith("/plantations") || path.startsWith("/crop-") || path.startsWith("/fallows") || path.startsWith("/varieties") || path.startsWith("/resources") || path.startsWith("/workers") || path.startsWith("/equipment") || path.startsWith("/contractors")) return { permission: write ? "farm.manage" : "farm.view", write: write && !releasesCapacity };
  return { write };
}
