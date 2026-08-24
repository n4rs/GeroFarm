import { randomUUID } from "node:crypto";
import { asc } from "drizzle-orm";
import { cropVarieties, farmAuditEvents, type CropVariety } from "@shared/schema";
import type { CreateVarietyInput, VarietyDto } from "@shared/crops";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";

export interface CropRepository { listVarieties(context: FarmRequestContext): Promise<VarietyDto[]>; createVariety(context: FarmRequestContext, input: CreateVarietyInput): Promise<VarietyDto>; }
const dto = (row: CropVariety): VarietyDto => ({ id: row.id, cultureId: row.cultureId, name: row.name, createdAt: row.createdAt.toISOString() });
export function createPostgresCropRepository(db: FarmDatabase): CropRepository {
  return {
    async listVarieties(context) { return withOrganizationTransaction(db, context.organization.id, async (tx) => (await tx.select().from(cropVarieties).orderBy(asc(cropVarieties.name))).map(dto)); },
    async createVariety(context, input) { return withOrganizationTransaction(db, context.organization.id, async (tx) => { const id = randomUUID(); const [created] = await tx.insert(cropVarieties).values({ id, organizationId: context.organization.id, ...input }).returning(); await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "crop_variety.created", entityType: "crop_variety", entityId: id, metadata: { cultureId: input.cultureId } }); return dto(created); }); },
  };
}
