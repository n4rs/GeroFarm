import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { fertilizationPlanFields, fertilizationPlans, farmAuditEvents, farmFields, irrigationRecords, plantations } from "@shared/schema";
import {
  calculateDeliveredNutrients,
  calculatePlannedNutrients,
  createFertilizationPlanSchema,
  planNutrientKeys,
  planWarnings,
  type CreateFertilizationPlanInput,
  type FertilizationPlanDto,
  type FertilizationPlanFieldDto,
} from "@shared/fertilization-plans";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";
import { createPostgresOperationRepository, type OperationRepository } from "./operations";

export interface FertilizationPlanRepository {
  list(context: FarmRequestContext): Promise<FertilizationPlanDto[]>;
  create(context: FarmRequestContext, input: CreateFertilizationPlanInput): Promise<FertilizationPlanDto>;
  activate(context: FarmRequestContext, id: string): Promise<FertilizationPlanDto | null>;
}

const number = (value: unknown) => Number(value || 0);

export function createPostgresFertilizationPlanRepository(
  db: FarmDatabase,
  operations: OperationRepository = createPostgresOperationRepository(db),
): FertilizationPlanRepository {
  const list = async (context: FarmRequestContext) => {
    const [operationRows, stored] = await Promise.all([
      operations.list(context),
      withOrganizationTransaction(db, context.organization.id, async (tx) => {
        const [plans, fields, irrigations] = await Promise.all([
          tx.select().from(fertilizationPlans).orderBy(asc(fertilizationPlans.cultureId), asc(fertilizationPlans.version)),
          tx.select().from(fertilizationPlanFields).orderBy(asc(fertilizationPlanFields.createdAt)),
          tx.select().from(irrigationRecords).orderBy(asc(irrigationRecords.performedAt)),
        ]);
        return { plans, fields, irrigations };
      }),
    ]);
    return stored.plans.map((plan): FertilizationPlanDto => ({
      id: plan.id,
      name: plan.name,
      cultureId: plan.cultureId,
      startsOn: plan.startsOn,
      endsOn: plan.endsOn,
      version: number(plan.version),
      status: plan.status as FertilizationPlanDto["status"],
      notes: plan.notes || undefined,
      createdAt: plan.createdAt.toISOString(),
      activatedAt: plan.activatedAt?.toISOString(),
      fields: stored.fields.filter((field) => field.planId === plan.id).map((field): FertilizationPlanFieldDto => {
        const base = {
          id: field.id,
          fieldId: field.fieldId,
          plantationId: field.plantationId || undefined,
          targetType: field.targetType as FertilizationPlanFieldDto["targetType"],
          targetLabel: field.targetLabel,
          areaHa: number(field.areaHa),
          objectivesKgHa: field.objectivesKgHa,
          plannedSources: field.plannedSources,
          irrigationSectorSnapshot: field.irrigationSectorSnapshot || undefined,
          nitrateAnalysisSnapshot: field.nitrateAnalysisSnapshot || undefined,
          irrigationForecastM3Ha: field.irrigationForecastM3Ha === null ? undefined : number(field.irrigationForecastM3Ha),
          includeCoverCrop: field.includeCoverCrop,
          coverCropContributionKgHa: field.coverCropContributionKgHa || undefined,
        };
        const delivered = calculateDeliveredNutrients(operationRows, base, plan.startsOn, plan.endsOn);
        const irrigationRows = stored.irrigations.filter((irrigation) => irrigation.status !== "scheduled" && irrigation.status !== "reversed" && irrigation.performedAt && irrigation.performedAt.toISOString().slice(0, 10) >= plan.startsOn && irrigation.performedAt.toISOString().slice(0, 10) <= plan.endsOn && irrigation.applications.some((application) => application.fieldIds.includes(field.fieldId)));
        const actualIrrigationM3Ha = Math.round(irrigationRows.reduce((sum, irrigation) => sum + number(irrigation.doseM3Ha), 0) * 1000) / 1000;
        const irrigationNitrateKgHa = Math.round(irrigationRows.reduce((sum, irrigation) => sum + number(irrigation.doseM3Ha) * number(irrigation.nitrateAnalysisSnapshot?.nitrateMgL) / 1000, 0) * 1000) / 1000;
        const planned = calculatePlannedNutrients(base);
        const balanceKgHa = Object.fromEntries(planNutrientKeys.map((key) => [key, Math.round((base.objectivesKgHa[key] - delivered.deliveredKgHa[key]) * 1000) / 1000])) as FertilizationPlanFieldDto["balanceKgHa"];
        const result = { ...base, ...delivered, ...planned, balanceKgHa, actualIrrigationM3Ha, irrigationNitrateKgHa, irrigationOperationCount: irrigationRows.length };
        return { ...result, warnings: planWarnings(result, plan.endsOn) };
      }),
    }));
  };

  return {
    list,
    async create(context, rawInput) {
      const input = createFertilizationPlanSchema.parse(rawInput);
      const id = randomUUID();
      await withOrganizationTransaction(db, context.organization.id, async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${context.organization.id}:${input.cultureId}`}))`);
        for (const row of input.fields) {
          const [field] = await tx.select({ usableAreaHa: farmFields.usableAreaHa }).from(farmFields).where(eq(farmFields.id, row.fieldId));
          if (!field) throw Object.assign(new Error("Field not found"), { status: 404, code: "FIELD_NOT_FOUND" });
          if (row.areaHa > number(field.usableAreaHa)) throw Object.assign(new Error("Plan area exceeds usable field area"), { status: 400, code: "PLAN_AREA_INVALID" });
          if (row.plantationId) {
            const [plantation] = await tx.select({ fieldId: plantations.fieldId, cultureId: plantations.cultureId, areaHa: plantations.areaHa }).from(plantations).where(eq(plantations.id, row.plantationId));
            if (!plantation || plantation.fieldId !== row.fieldId || plantation.cultureId !== input.cultureId) throw Object.assign(new Error("Plan plantation is incompatible"), { status: 400, code: "PLAN_PLANTATION_INVALID" });
            if (row.areaHa > number(plantation.areaHa)) throw Object.assign(new Error("Plan area exceeds plantation area"), { status: 400, code: "PLAN_AREA_INVALID" });
          }
        }
        const [latest] = await tx.select({ version: sql<number>`coalesce(max(${fertilizationPlans.version}), 0)` }).from(fertilizationPlans).where(eq(fertilizationPlans.cultureId, input.cultureId));
        await tx.insert(fertilizationPlans).values({ id, organizationId: context.organization.id, name: input.name, cultureId: input.cultureId, startsOn: input.startsOn, endsOn: input.endsOn, version: String(number(latest?.version) + 1), status: "draft", notes: input.notes });
        await tx.insert(fertilizationPlanFields).values(input.fields.map((row) => ({ id: randomUUID(), planId: id, organizationId: context.organization.id, fieldId: row.fieldId, plantationId: row.plantationId, targetType: row.targetType, targetLabel: row.targetLabel, areaHa: row.areaHa.toString(), objectivesKgHa: row.objectivesKgHa, plannedSources: row.plannedSources, irrigationSectorSnapshot: row.irrigationSectorSnapshot, nitrateAnalysisSnapshot: row.nitrateAnalysisSnapshot, irrigationForecastM3Ha: row.irrigationForecastM3Ha?.toString(), includeCoverCrop: row.includeCoverCrop, coverCropContributionKgHa: row.coverCropContributionKgHa })));
        await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "fertilization_plan.draft_created", entityType: "fertilization_plan", entityId: id, metadata: { cultureId: input.cultureId, version: number(latest?.version) + 1, fieldCount: input.fields.length } });
      });
      return (await list(context)).find((plan) => plan.id === id)!;
    },
    async activate(context, id) {
      const activated = await withOrganizationTransaction(db, context.organization.id, async (tx) => {
        const [plan] = await tx.select().from(fertilizationPlans).where(eq(fertilizationPlans.id, id)).for("update");
        if (!plan) return false;
        if (plan.status !== "draft") throw Object.assign(new Error("Only a draft plan can enter into force"), { status: 409, code: "PLAN_NOT_DRAFT" });
        await tx.update(fertilizationPlans).set({ status: "superseded" }).where(and(eq(fertilizationPlans.cultureId, plan.cultureId), eq(fertilizationPlans.status, "in_force")));
        await tx.update(fertilizationPlans).set({ status: "in_force", activatedAt: new Date() }).where(eq(fertilizationPlans.id, id));
        await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action: "fertilization_plan.activated", entityType: "fertilization_plan", entityId: id, metadata: { cultureId: plan.cultureId, version: number(plan.version) } });
        return true;
      });
      return activated ? (await list(context)).find((plan) => plan.id === id) || null : null;
    },
  };
}
