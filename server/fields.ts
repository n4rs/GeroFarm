import { randomUUID } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { farmAuditEvents, farmFields, farmHoldings, fieldFallows, plantations, type FarmField } from "@shared/schema";
import type { CreateFieldInput, FieldDto, UpdateFieldInput } from "@shared/fields";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";
import { FieldDomainError, polygonOverlapAreaHa, validateFieldGeometry } from "./field-geometry";

export interface FieldRepository { list(context: FarmRequestContext): Promise<FieldDto[]>; create(context: FarmRequestContext, input: CreateFieldInput): Promise<FieldDto>; update(context: FarmRequestContext, id: string, input: UpdateFieldInput): Promise<FieldDto | null>; }

function dto(row: FarmField, occupiedAreaHa = 0): FieldDto { const totalAreaHa = Number(row.totalAreaHa); const usableAreaHa = Number(row.usableAreaHa); return { ...row, totalAreaHa, usableAreaHa, occupiedAreaHa, freeAreaHa: row.manuallyClosed || row.status !== "active" ? 0 : Math.max(0, usableAreaHa - occupiedAreaHa), status: row.status as FieldDto["status"], codeLocked: Boolean(row.codeLockedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
function roundedArea(value: number) { return Number(value.toFixed(4)); }

export function createPostgresFieldRepository(db: FarmDatabase): FieldRepository {
  return {
    async list(context) { return withOrganizationTransaction(db, context.organization.id, async (tx) => { const [rows, activePlantations, activeFallows] = await Promise.all([tx.select().from(farmFields).orderBy(asc(farmFields.name)), tx.select({ fieldId: plantations.fieldId, areaHa: plantations.areaHa }).from(plantations).where(eq(plantations.status, "active")), tx.select({ fieldId: fieldFallows.fieldId, areaHa: fieldFallows.areaHa }).from(fieldFallows).where(eq(fieldFallows.status, "active"))]); const occupied = new Map<string, number>(); for (const item of [...activePlantations, ...activeFallows]) occupied.set(item.fieldId, roundedArea((occupied.get(item.fieldId) || 0) + Number(item.areaHa))); return rows.map((row) => dto(row, occupied.get(row.id) || 0)); }); },
    async create(context, input) { return withOrganizationTransaction(db, context.organization.id, async (tx) => {
      const [holding] = await tx.select({ id: farmHoldings.id }).from(farmHoldings).where(and(eq(farmHoldings.id, input.holdingId), eq(farmHoldings.status, "active"))).limit(1);
      if (!holding) throw new FieldDomainError(400, "FIELD_HOLDING_INVALID");
      const totalAreaHa = roundedArea(validateFieldGeometry(input.geometry)); const usableAreaHa = roundedArea(input.usableAreaHa ?? totalAreaHa);
      if (usableAreaHa <= 0 || usableAreaHa > totalAreaHa) throw new FieldDomainError(400, "FIELD_USABLE_AREA_INVALID");
      const existing = await tx.select({ id: farmFields.id, code: farmFields.code, geometry: farmFields.geometry }).from(farmFields).where(eq(farmFields.status, "active"));
      const overlaps = existing.map((candidate) => ({ id: candidate.id, code: candidate.code, areaHa: roundedArea(polygonOverlapAreaHa(input.geometry, candidate.geometry)) })).filter(({ areaHa }) => areaHa >= 0.0001);
      if (overlaps.length) throw new FieldDomainError(409, "FIELD_GEOMETRY_OVERLAP", { overlaps });
      const id = randomUUID(); const [created] = await tx.insert(farmFields).values({ id, organizationId: context.organization.id, ...input, totalAreaHa: String(totalAreaHa), usableAreaHa: String(usableAreaHa) }).returning();
      await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "field.created", entityType: "field", entityId: id, metadata: { code: created.code, totalAreaHa } }); return dto(created);
    }); },
    async update(context, id, input) { return withOrganizationTransaction(db, context.organization.id, async (tx) => {
      const [current] = await tx.select().from(farmFields).where(eq(farmFields.id, id)).limit(1); if (!current) return null;
      if (input.code && input.code !== current.code && current.codeLockedAt) throw new FieldDomainError(409, "FIELD_CODE_LOCKED");
      if (input.holdingId) { const [holding] = await tx.select({ id: farmHoldings.id }).from(farmHoldings).where(and(eq(farmHoldings.id, input.holdingId), eq(farmHoldings.status, "active"))).limit(1); if (!holding) throw new FieldDomainError(400, "FIELD_HOLDING_INVALID"); }
      const geometry = input.geometry ?? current.geometry; const totalAreaHa = roundedArea(validateFieldGeometry(geometry)); const usableAreaHa = roundedArea(input.usableAreaHa ?? Number(current.usableAreaHa));
      if (usableAreaHa <= 0 || usableAreaHa > totalAreaHa) throw new FieldDomainError(400, "FIELD_USABLE_AREA_INVALID");
      const [occupiedPlantations, occupiedFallows] = await Promise.all([tx.select({ areaHa: plantations.areaHa }).from(plantations).where(and(eq(plantations.fieldId, id), eq(plantations.status, "active"))), tx.select({ areaHa: fieldFallows.areaHa }).from(fieldFallows).where(and(eq(fieldFallows.fieldId, id), eq(fieldFallows.status, "active")))]); const occupiedAreaHa = [...occupiedPlantations, ...occupiedFallows].reduce((sum, row) => sum + Number(row.areaHa), 0); if (usableAreaHa + 0.00005 < occupiedAreaHa) throw new FieldDomainError(409, "FIELD_USABLE_AREA_OCCUPIED", { occupiedAreaHa: roundedArea(occupiedAreaHa) });
      if (input.geometry) { const existing = await tx.select({ id: farmFields.id, code: farmFields.code, geometry: farmFields.geometry }).from(farmFields).where(and(eq(farmFields.status, "active"), ne(farmFields.id, id))); const overlaps = existing.map((candidate) => ({ id: candidate.id, code: candidate.code, areaHa: roundedArea(polygonOverlapAreaHa(geometry, candidate.geometry)) })).filter(({ areaHa }) => areaHa >= 0.0001); if (overlaps.length) throw new FieldDomainError(409, "FIELD_GEOMETRY_OVERLAP", { overlaps }); }
      const [updated] = await tx.update(farmFields).set({ ...input, geometry, totalAreaHa: String(totalAreaHa), usableAreaHa: String(usableAreaHa), updatedAt: new Date() }).where(eq(farmFields.id, id)).returning();
      await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "field.updated", entityType: "field", entityId: id, metadata: { changedFields: Object.keys(input).sort().join(",") } }); return dto(updated);
    }); },
  };
}
