import { sql } from "drizzle-orm";
import { boolean, check, date, index, jsonb, numeric, pgPolicy, pgSchema, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { FieldPolygon } from "./fields";

export const farmSchema = pgSchema("farm");

/**
 * Privacy-minimised local projection of a Gero Core organization.
 *
 * Gero Core remains the source of truth for identity, membership and access.
 * Future product tables reference this key and inherit the same tenant boundary.
 */
export const farmOrganizations = farmSchema.table("organizations", {
  organizationId: uuid("organization_id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  defaultLocale: varchar("default_locale", { length: 16 }).notNull().default("pt-PT"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Lisbon"),
  coreSyncedAt: timestamp("core_synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  pgPolicy("organizations_tenant_isolation", {
    as: "restrictive",
    for: "all",
    to: "public",
    using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
    withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
  }),
]).enableRLS();

export type FarmOrganization = typeof farmOrganizations.$inferSelect;
export type NewFarmOrganization = typeof farmOrganizations.$inferInsert;

export const farmHoldings = farmSchema.table("farm_holdings", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId),
  code: varchar("code", { length: 12 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("farm_holdings_organization_code_unique").on(table.organizationId, table.code),
  index("farm_holdings_organization_status_idx").on(table.organizationId, table.status),
  check("farm_holdings_code_format", sql`${table.code} ~ '^[A-Z0-9]{2,12}$'`),
  check("farm_holdings_status_valid", sql`${table.status} in ('active', 'inactive')`),
  pgPolicy("farm_holdings_tenant_isolation", {
    as: "restrictive", for: "all", to: "public",
    using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
    withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
  }),
]).enableRLS();

export const farmAuditEvents = farmSchema.table("audit_events", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId),
  actorUserId: uuid("actor_user_id").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_events_organization_entity_idx").on(table.organizationId, table.entityType, table.entityId),
  pgPolicy("audit_events_tenant_isolation", {
    as: "restrictive", for: "all", to: "public",
    using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
    withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`,
  }),
]).enableRLS();

export type FarmHolding = typeof farmHoldings.$inferSelect;
export type NewFarmHolding = typeof farmHoldings.$inferInsert;

export const farmFields = farmSchema.table("fields", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId),
  holdingId: uuid("holding_id").notNull().references(() => farmHoldings.id),
  code: varchar("code", { length: 4 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  geometry: jsonb("geometry").$type<FieldPolygon>().notNull(),
  totalAreaHa: numeric("total_area_ha", { precision: 12, scale: 4 }).notNull(),
  usableAreaHa: numeric("usable_area_ha", { precision: 12, scale: 4 }).notNull(),
  manuallyClosed: boolean("manually_closed").notNull().default(false),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  codeLockedAt: timestamp("code_locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("fields_organization_code_unique").on(table.organizationId, table.code),
  index("fields_holding_status_idx").on(table.organizationId, table.holdingId, table.status),
  check("fields_code_format", sql`${table.code} ~ '^[A-Z0-9]{4}$' and ${table.code} <> '0MIX'`),
  check("fields_area_valid", sql`${table.totalAreaHa} > 0 and ${table.usableAreaHa} > 0 and ${table.usableAreaHa} <= ${table.totalAreaHa}`),
  check("fields_status_valid", sql`${table.status} in ('active', 'inactive')`),
  pgPolicy("fields_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` }),
]).enableRLS();

export type FarmField = typeof farmFields.$inferSelect;

export const cropVarieties = farmSchema.table("crop_varieties", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId),
  cultureId: varchar("culture_id", { length: 32 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("crop_varieties_organization_culture_name_unique").on(table.organizationId, table.cultureId, table.name),
  index("crop_varieties_organization_culture_idx").on(table.organizationId, table.cultureId),
  check("crop_varieties_culture_id_format", sql`${table.cultureId} ~ '^pt-drap-[0-9]{3}$'`),
  pgPolicy("crop_varieties_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` }),
]).enableRLS();

export type CropVariety = typeof cropVarieties.$inferSelect;

export const plantations = farmSchema.table("plantations", {
  id: uuid("id").primaryKey(), organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId), fieldId: uuid("field_id").notNull().references(() => farmFields.id), cultureId: varchar("culture_id", { length: 32 }).notNull(), varietyId: uuid("variety_id").references(() => cropVarieties.id),
  name: varchar("name", { length: 160 }).notNull(), kind: varchar("kind", { length: 16 }).notNull(), areaHa: numeric("area_ha", { precision: 12, scale: 4 }).notNull(), startedOn: date("started_on").notNull(), endedOn: date("ended_on"), status: varchar("status", { length: 16 }).notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("plantations_field_status_idx").on(table.organizationId, table.fieldId, table.status), check("plantations_kind_valid", sql`${table.kind} in ('permanent','temporary')`), check("plantations_status_valid", sql`${table.status} in ('active','ended','uprooted')`), check("plantations_area_valid", sql`${table.areaHa} > 0`), check("plantations_dates_valid", sql`${table.endedOn} is null or ${table.endedOn} >= ${table.startedOn}`), pgPolicy("plantations_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` })]).enableRLS();
export type Plantation = typeof plantations.$inferSelect;

export const cropPeriods = farmSchema.table("crop_periods", {
  id: uuid("id").primaryKey(), organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId), plantationId: uuid("plantation_id").notNull().references(() => plantations.id), kind: varchar("kind", { length: 16 }).notNull(), name: varchar("name", { length: 160 }).notNull(), startedOn: date("started_on").notNull(), endedOn: date("ended_on"), status: varchar("status", { length: 16 }).notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("crop_periods_plantation_status_idx").on(table.organizationId, table.plantationId, table.status), check("crop_periods_kind_valid", sql`${table.kind} in ('campaign','cycle')`), check("crop_periods_status_valid", sql`${table.status} in ('active','closed')`), check("crop_periods_dates_valid", sql`${table.endedOn} is null or ${table.endedOn} >= ${table.startedOn}`), pgPolicy("crop_periods_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` })]).enableRLS();
export type CropPeriod = typeof cropPeriods.$inferSelect;

export const plantationUprootings = farmSchema.table("plantation_uprootings", {
  id: uuid("id").primaryKey(), organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId), plantationId: uuid("plantation_id").notNull().references(() => plantations.id), uprootedOn: date("uprooted_on").notNull(), reason: varchar("reason", { length: 500 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("plantation_uprootings_plantation_unique").on(table.plantationId), pgPolicy("plantation_uprootings_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` })]).enableRLS();

export const fieldFallows = farmSchema.table("field_fallows", {
  id: uuid("id").primaryKey(), organizationId: uuid("organization_id").notNull().references(() => farmOrganizations.organizationId), fieldId: uuid("field_id").notNull().references(() => farmFields.id), name: varchar("name", { length: 160 }).notNull(), areaHa: numeric("area_ha", { precision: 12, scale: 4 }).notNull(), startedOn: date("started_on").notNull(), endedOn: date("ended_on"), status: varchar("status", { length: 16 }).notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("field_fallows_field_status_idx").on(table.organizationId, table.fieldId, table.status), check("field_fallows_area_valid", sql`${table.areaHa} > 0`), check("field_fallows_status_valid", sql`${table.status} in ('active','closed')`), check("field_fallows_dates_valid", sql`${table.endedOn} is null or ${table.endedOn} >= ${table.startedOn}`), pgPolicy("field_fallows_tenant_isolation", { as: "restrictive", for: "all", to: "public", using: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid`, withCheck: sql`${table.organizationId} = nullif(current_setting('app.organization_id', true), '')::uuid` })]).enableRLS();
export type FieldFallow = typeof fieldFallows.$inferSelect;
