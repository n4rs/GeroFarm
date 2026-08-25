import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { farmAuditEvents, farmHoldings, farmOrganizations, type FarmHolding } from "@shared/schema";
import type { CreateFarmHoldingInput, FarmHoldingDto, UpdateFarmHoldingInput } from "@shared/farm-holdings";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";

export interface FarmHoldingRepository {
  list(context: FarmRequestContext): Promise<FarmHoldingDto[]>;
  create(context: FarmRequestContext, input: CreateFarmHoldingInput): Promise<FarmHoldingDto>;
  update(context: FarmRequestContext, id: string, input: UpdateFarmHoldingInput): Promise<FarmHoldingDto | null>;
}

function dto(row: FarmHolding): FarmHoldingDto {
  return { ...row, status: row.status as FarmHoldingDto["status"], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function organizationProjection(context: FarmRequestContext) {
  return { organizationId: context.organization.id, name: context.organization.name, slug: context.organization.slug, coreSyncedAt: new Date(), updatedAt: new Date() };
}

export function createPostgresFarmHoldingRepository(db: FarmDatabase): FarmHoldingRepository {
  return {
    async list(context) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        await tx.insert(farmOrganizations).values(organizationProjection(context)).onConflictDoUpdate({ target: farmOrganizations.organizationId, set: organizationProjection(context) });
        return (await tx.select().from(farmHoldings).orderBy(asc(farmHoldings.name))).map(dto);
      });
    },
    async create(context, input) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        await tx.insert(farmOrganizations).values(organizationProjection(context)).onConflictDoUpdate({ target: farmOrganizations.organizationId, set: organizationProjection(context) });
        const id = randomUUID();
        const [created] = await tx.insert(farmHoldings).values({ id, organizationId: context.organization.id, ...input }).onConflictDoNothing({ target: farmHoldings.organizationId }).returning();
        if (!created) throw Object.assign(new Error("An organization can contain only one agricultural holding"), { status: 409, code: "FARM_HOLDING_ALREADY_EXISTS" });
        await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "farm_holding.created", entityType: "farm_holding", entityId: id, metadata: { code: created.code } });
        return dto(created);
      });
    },
    async update(context, id, input) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        const [updated] = await tx.update(farmHoldings).set({ ...input, updatedAt: new Date() }).where(eq(farmHoldings.id, id)).returning();
        if (!updated) return null;
        await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "farm_holding.updated", entityType: "farm_holding", entityId: id, metadata: { changedFields: Object.keys(input).sort().join(",") } });
        return dto(updated);
      });
    },
  };
}
