import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { farmAuditEvents, farmContractors, farmEquipment, farmFields, farmOperations, farmWorkers, operationContractors, operationDestinations, operationEquipment, operationSequences, operationSoilPreparations, operationWorkers, plantations, type FarmOperation } from "@shared/schema";
import type { CreateOperationInput, OperationDto } from "@shared/operations";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";

export interface OperationRepository { list(context: FarmRequestContext): Promise<OperationDto[]>; create(context: FarmRequestContext, input: CreateOperationInput): Promise<OperationDto> }
const base = (row: FarmOperation) => ({ id: row.id, code: row.code, type: row.type as OperationDto["type"], performedAt: row.performedAt.toISOString(), durationMinutes: row.durationMinutes ? Number(row.durationMinutes) : undefined, notes: row.notes || undefined, status: row.status as OperationDto["status"], createdAt: row.createdAt.toISOString() });

export function createPostgresOperationRepository(db: FarmDatabase): OperationRepository {
  return {
    async list(context) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        const [rows, destinations, soilPreparations, workers, equipment, contractors] = await Promise.all([tx.select().from(farmOperations).orderBy(asc(farmOperations.performedAt)), tx.select().from(operationDestinations), tx.select().from(operationSoilPreparations), tx.select().from(operationWorkers), tx.select().from(operationEquipment), tx.select().from(operationContractors)]);
        return rows.map((row) => {
          const soil = soilPreparations.find((item) => item.operationId === row.id);
          return { ...base(row), destinations: destinations.filter((item) => item.operationId === row.id).map((item) => ({ fieldId: item.fieldId, plantationId: item.plantationId || undefined, areaHa: Number(item.areaHa), percentage: Number(item.percentage) })), ...(soil ? { soilPreparation: { actions: soil.actions, depthCm: soil.depthCm ? Number(soil.depthCm) : undefined, passes: soil.passes ? Number(soil.passes) : undefined, soilCondition: soil.soilCondition as NonNullable<OperationDto["soilPreparation"]>["soilCondition"], residueDestination: soil.residueDestination as NonNullable<OperationDto["soilPreparation"]>["residueDestination"] } } : {}), workerIds: workers.filter((item) => item.operationId === row.id).map((item) => item.workerId), equipmentIds: equipment.filter((item) => item.operationId === row.id).map((item) => item.equipmentId), contractorIds: contractors.filter((item) => item.operationId === row.id).map((item) => item.contractorId) };
        });
      });
    },
    async create(context, input) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        for (const destination of input.destinations) {
          const [field] = await tx.select({ id: farmFields.id, usableAreaHa: farmFields.usableAreaHa }).from(farmFields).where(eq(farmFields.id, destination.fieldId));
          if (!field) throw Object.assign(new Error("Field not found"), { status: 404, code: "FIELD_NOT_FOUND" });
          if (destination.areaHa > Number(field.usableAreaHa)) throw Object.assign(new Error("Operation area exceeds usable field area"), { status: 400, code: "OPERATION_AREA_INVALID" });
          if (destination.plantationId) { const [plantation] = await tx.select({ fieldId: plantations.fieldId, areaHa: plantations.areaHa }).from(plantations).where(eq(plantations.id, destination.plantationId)); if (!plantation || plantation.fieldId !== destination.fieldId) throw Object.assign(new Error("Plantation does not belong to field"), { status: 400, code: "OPERATION_PLANTATION_INVALID" }); if (destination.areaHa > Number(plantation.areaHa)) throw Object.assign(new Error("Operation area exceeds plantation area"), { status: 400, code: "OPERATION_AREA_INVALID" }); }
        }
        for (const [ids, table, label] of [[input.workerIds, farmWorkers, "WORKER"], [input.equipmentIds, farmEquipment, "EQUIPMENT"], [input.contractorIds, farmContractors, "CONTRACTOR"]] as const) for (const resourceId of ids) { const [row] = await tx.select({ id: table.id }).from(table).where(eq(table.id, resourceId)); if (!row) throw Object.assign(new Error(`${label} not found`), { status: 400, code: `OPERATION_${label}_INVALID` }); }
        const year = new Date(input.performedAt).getUTCFullYear(); const result = await tx.execute(sql`insert into ${operationSequences} (organization_id,year,next_value) values (${context.organization.id},${year},2) on conflict (organization_id,year) do update set next_value=${operationSequences.nextValue}+1 returning next_value-1 as value`); const value = Number((result.rows[0] as { value: string }).value); const code = `OP-${year}-${String(value).padStart(6, "0")}`; const id = randomUUID();
        const [created] = await tx.insert(farmOperations).values({ id, organizationId: context.organization.id, code, type: input.type, performedAt: new Date(input.performedAt), durationMinutes: input.durationMinutes ? String(input.durationMinutes) : null, notes: input.notes }).returning();
        await tx.insert(operationDestinations).values(input.destinations.map((destination) => ({ id: randomUUID(), operationId: id, organizationId: context.organization.id, fieldId: destination.fieldId, plantationId: destination.plantationId, areaHa: String(destination.areaHa), percentage: String(destination.percentage) })));
        if (input.soilPreparation) await tx.insert(operationSoilPreparations).values({ operationId: id, organizationId: context.organization.id, actions: input.soilPreparation.actions, depthCm: input.soilPreparation.depthCm ? String(input.soilPreparation.depthCm) : null, passes: input.soilPreparation.passes ? String(input.soilPreparation.passes) : null, soilCondition: input.soilPreparation.soilCondition, residueDestination: input.soilPreparation.residueDestination });
        if (input.workerIds.length) await tx.insert(operationWorkers).values(input.workerIds.map((workerId) => ({ operationId: id, workerId, organizationId: context.organization.id })));
        if (input.equipmentIds.length) await tx.insert(operationEquipment).values(input.equipmentIds.map((equipmentId) => ({ operationId: id, equipmentId, organizationId: context.organization.id })));
        if (input.contractorIds.length) await tx.insert(operationContractors).values(input.contractorIds.map((contractorId) => ({ operationId: id, contractorId, organizationId: context.organization.id })));
        await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "operation.performed", entityType: "operation", entityId: id, metadata: { code, type: input.type, destinations: input.destinations.length } });
        return { ...base(created), destinations: input.destinations, ...(input.soilPreparation ? { soilPreparation: input.soilPreparation } : {}), workerIds: input.workerIds, equipmentIds: input.equipmentIds, contractorIds: input.contractorIds };
      });
    },
  };
}
