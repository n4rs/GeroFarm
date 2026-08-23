import { sql } from "drizzle-orm";
import { pgPolicy, pgSchema, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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
