import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  farmAuditEvents, farmFields, farmHoldings, farmOperations, operationContractors, operationDestinations, operationEquipment,
  operationFertilizations, operationSequences, operationWorkers, plantations, irrigationRecords, farmWorkers, farmEquipment, farmContractors,
  irrigationSectorFields, irrigationSectors, irrigationWaterAnalyses, irrigationWaterAnalysisSectors,
  waterMeterReadings, waterMeters, waterMeterSectors,
} from "@shared/schema";
import {
  createIrrigationSchema, createIrrigationSectorSchema, createMeterReadingSchema, createWaterAnalysisSchema,
  createWaterMeterSchema, deriveHydraulicValues, isNitrateAnalysisStale, readingDifference, reconcileConsumption, scheduledWeekPerformedAt,
  type CreateIrrigationInput, type CreateIrrigationSectorInput, type CreateMeterReadingInput,
  type CreateWaterAnalysisInput, type CreateWaterMeterInput, type IrrigationDto, type IrrigationOverviewDto,
  type IrrigationSectorDto, type MeterReadingDto, type WaterAnalysisDto, type WaterMeterDto,
} from "@shared/irrigation";
import { calculateNutrientTotals } from "@shared/operations";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmRequestContext } from "./farm-context";

type Tx = Parameters<Parameters<FarmDatabase["transaction"]>[0]>[0];
const number = (value: unknown) => Number(value || 0);
const dateInTimeZone = (date: Date, timeZone: string) => Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map((part) => [part.type, part.value]));
const domainError = (message: string, code: string, status = 400) => Object.assign(new Error(message), { code, status });

export interface IrrigationRepository {
  overview(context: FarmRequestContext, now?: Date): Promise<IrrigationOverviewDto>;
  createSector(context: FarmRequestContext, input: CreateIrrigationSectorInput): Promise<IrrigationSectorDto>;
  createMeter(context: FarmRequestContext, input: CreateWaterMeterInput): Promise<WaterMeterDto>;
  addReading(context: FarmRequestContext, meterId: string, input: CreateMeterReadingInput): Promise<MeterReadingDto>;
  createAnalysis(context: FarmRequestContext, input: CreateWaterAnalysisInput): Promise<WaterAnalysisDto>;
  createIrrigation(context: FarmRequestContext, input: CreateIrrigationInput): Promise<IrrigationDto>;
  finalizeDue(context: FarmRequestContext, now?: Date): Promise<number>;
  reverse(context: FarmRequestContext, id: string): Promise<IrrigationDto | null>;
}

async function audit(tx: Tx, context: FarmRequestContext, action: string, entityType: string, entityId: string, metadata: Record<string, string | number | boolean | null> = {}) {
  await tx.insert(farmAuditEvents).values({ id: randomUUID(), organizationId: context.organization.id, actorUserId: context.user.id, action, entityType, entityId, metadata });
}

async function nextOperation(tx: Tx, organizationId: string, performedAt: Date, timezone: string) {
  const year = Number(dateInTimeZone(performedAt,timezone).year);
  const result = await tx.execute(sql`insert into ${operationSequences} (organization_id,year,next_value) values (${organizationId},${year},2) on conflict (organization_id,year) do update set next_value=${operationSequences.nextValue}+1 returning next_value-1 as value`);
  return `OP-${year}-${String(Number((result.rows[0] as { value: string }).value)).padStart(6, "0")}`;
}

export function createPostgresIrrigationRepository(db: FarmDatabase): IrrigationRepository {
  const buildOverview = async (context: FarmRequestContext): Promise<IrrigationOverviewDto> => withOrganizationTransaction(db, context.organization.id, async (tx) => {
    const [sectorRows, sectorFields, meterRows, meterSectorRows, readingRows, analysisRows, analysisSectors, irrigationRows, operationRows] = await Promise.all([
      tx.select().from(irrigationSectors).orderBy(asc(irrigationSectors.code)), tx.select().from(irrigationSectorFields),
      tx.select().from(waterMeters).orderBy(asc(waterMeters.code)), tx.select().from(waterMeterSectors),
      tx.select().from(waterMeterReadings).orderBy(asc(waterMeterReadings.readAt)), tx.select().from(irrigationWaterAnalyses).orderBy(asc(irrigationWaterAnalyses.sampledOn)),
      tx.select().from(irrigationWaterAnalysisSectors), tx.select().from(irrigationRecords).orderBy(asc(irrigationRecords.createdAt)),
      tx.select({ id: farmOperations.id, code: farmOperations.code }).from(farmOperations),
    ]);
    const fieldRows = await tx.select({ id: farmFields.id, area: farmFields.usableAreaHa }).from(farmFields);
    const fieldArea = new Map(fieldRows.map((row) => [row.id, number(row.area)]));
    const sectors: IrrigationSectorDto[] = sectorRows.map((row) => {
      const fieldIds = sectorFields.filter((item) => item.sectorId === row.id).map((item) => item.fieldId);
      return { id: row.id, holdingId: row.holdingId, code: row.code, name: row.name, system: row.system as IrrigationSectorDto["system"], customSystem: row.customSystem || undefined, efficiencyPercent: row.efficiencyPercent ? number(row.efficiencyPercent) : undefined, fieldIds, areaHa: fieldIds.reduce((sum, fieldId) => sum + (fieldArea.get(fieldId) || 0), 0), status: row.status as IrrigationSectorDto["status"], createdAt: row.createdAt.toISOString() };
    });
    const meters: WaterMeterDto[] = meterRows.map((row) => ({ id: row.id, holdingId: row.holdingId, code: row.code, name: row.name, serialNumber: row.serialNumber, unit: "m3", sectorIds: meterSectorRows.filter((item) => item.meterId === row.id).map((item) => item.sectorId), status: row.status as WaterMeterDto["status"], createdAt: row.createdAt.toISOString() }));
    const readings: MeterReadingDto[] = readingRows.map((row) => ({ id: row.id, meterId: row.meterId, readAt: row.readAt.toISOString(), valueM3: number(row.valueM3), origin: row.origin as MeterReadingDto["origin"], event: row.event as MeterReadingDto["event"], photoUrl: row.photoUrl || undefined, notes: row.notes || undefined, createdAt: row.createdAt.toISOString() }));
    const analyses: WaterAnalysisDto[] = analysisRows.map((row) => ({ id: row.id, sampledOn: row.sampledOn, nitrateMgL: number(row.nitrateMgL), source: row.source || undefined, sectorIds: analysisSectors.filter((item) => item.analysisId === row.id).map((item) => item.sectorId), createdAt: row.createdAt.toISOString() }));
    const operationById = new Map(operationRows.map((row) => [row.id, row.code]));
    const irrigations: IrrigationDto[] = irrigationRows.map((row) => ({ id: row.id, operationId: row.operationId || undefined, operationCode: row.operationId ? operationById.get(row.operationId) : undefined, kind: row.status === "scheduled" ? "weekly_schedule" : "performed", status: row.status as IrrigationDto["status"], inputMode: row.inputMode as IrrigationDto["inputMode"], scheduledWeekEnd: row.scheduledWeekEnd || undefined, performedAt: row.performedAt?.toISOString(), areaHa: number(row.areaHa), volumeM3: number(row.volumeM3), doseM3Ha: number(row.doseM3Ha), depthMm: number(row.depthMm), flowM3H: row.flowM3H ? number(row.flowM3H) : undefined, durationMinutes: row.durationMinutes ? number(row.durationMinutes) : undefined, applications: row.applications, meterAllocations: row.meterAllocations, waterAnalysisId: row.waterAnalysisId || undefined, fertigation: row.fertigationSnapshot as IrrigationDto["fertigation"], workerIds: row.resourceSnapshot.workerIds, equipmentIds: row.resourceSnapshot.equipmentIds, contractorIds: row.resourceSnapshot.contractorIds, notes: row.notes || undefined, nitrateAnalysisSnapshot: row.nitrateAnalysisSnapshot || undefined, projectionKinds: ["operations", ...(row.fertigationSnapshot ? ["fertilization", "plans"] as const : []), "notebook"], createdAt: row.createdAt.toISOString() }));
    const reconciliations = meters.map((meter) => {
      const rows = readings.filter((row) => row.meterId === meter.id);
      let measured = 0;
      for (let index = 1; index < rows.length; index += 1) {
        try { measured += readingDifference(rows[index - 1], rows[index]); } catch { /* explicit discontinuities are separate audit periods */ }
      }
      const registered = irrigations.filter((row) => row.status !== "scheduled" && row.status !== "reversed").flatMap((row) => row.meterAllocations).filter((item) => item.meterId === meter.id).reduce((sum, item) => sum + (item.volumeM3 || 0), 0);
      return { meterId: meter.id, ...reconcileConsumption(measured, registered) };
    });
    return { sectors, meters, readings, analyses, irrigations, reconciliations, undistributedConsumptionM3: reconciliations.reduce((sum, row) => sum + row.undistributedM3, 0) };
  });

  async function prepare(context: FarmRequestContext, input: CreateIrrigationInput, tx: Tx) {
    const sectorIds = input.applications.map((row) => row.sectorId);
    const sectors = await tx.select({ id: irrigationSectors.id, holdingId: irrigationSectors.holdingId }).from(irrigationSectors).where(inArray(irrigationSectors.id, sectorIds));
    if (sectors.length !== sectorIds.length || new Set(sectors.map((row) => row.holdingId)).size !== 1) throw domainError("All irrigation sectors must belong to the same holding", "IRRIGATION_HOLDING_INVALID");
    const [holding] = await tx.select({ timezone: farmHoldings.timezone }).from(farmHoldings).where(eq(farmHoldings.id, sectors[0].holdingId));
    if (!holding) throw domainError("Farm holding not found", "FARM_HOLDING_NOT_FOUND", 404);
    const assignments = await tx.select().from(irrigationSectorFields).where(inArray(irrigationSectorFields.sectorId, sectorIds));
    const allowed = new Map<string, Set<string>>();
    for (const row of assignments) (allowed.get(row.sectorId) || (allowed.set(row.sectorId, new Set()), allowed.get(row.sectorId)!)).add(row.fieldId);
    const selectedFieldIds = [...new Set(input.applications.flatMap((row) => row.fieldIds))];
    for (const application of input.applications) for (const fieldId of application.fieldIds) if (!allowed.get(application.sectorId)?.has(fieldId)) throw domainError("Irrigation fields must belong wholly to the selected sector", "IRRIGATION_SECTOR_FIELD_INVALID");
    const fields = await tx.select({ id: farmFields.id, area: farmFields.usableAreaHa }).from(farmFields).where(inArray(farmFields.id, selectedFieldIds));
    if (fields.length !== selectedFieldIds.length) throw domainError("Field not found", "FIELD_NOT_FOUND", 404);
    for (const [ids, table, code] of [
      [input.workerIds, farmWorkers, "IRRIGATION_WORKER_INVALID"],
      [input.equipmentIds, farmEquipment, "IRRIGATION_EQUIPMENT_INVALID"],
      [input.contractorIds, farmContractors, "IRRIGATION_CONTRACTOR_INVALID"],
    ] as const) {
      const uniqueIds = [...new Set(ids)];
      if (!uniqueIds.length) continue;
      const rows = await tx.select({ id: table.id }).from(table).where(inArray(table.id, uniqueIds));
      if (rows.length !== uniqueIds.length) throw domainError("Irrigation resource is outside the selected organization", code);
    }
    const selectedPlantationIds = [...new Set(input.applications.flatMap((row) => row.plantationIds))];
    const plantationRows = selectedPlantationIds.length ? await tx.select({ id: plantations.id, fieldId: plantations.fieldId, area: plantations.areaHa }).from(plantations).where(inArray(plantations.id, selectedPlantationIds)) : [];
    if (plantationRows.length !== selectedPlantationIds.length || plantationRows.some((row) => !selectedFieldIds.includes(row.fieldId))) throw domainError("Plantation is outside the irrigated fields", "IRRIGATION_PLANTATION_INVALID");
    const destinationAreas = fields.map((field) => {
      const selected = plantationRows.filter((row) => row.fieldId === field.id);
      return { fieldId: field.id, areaHa: selected.length ? Math.min(number(field.area), selected.reduce((area, row) => area + number(row.area), 0)) : number(field.area), plantationId: selected.length === 1 ? selected[0].id : undefined };
    });
    const areaHa = destinationAreas.reduce((sum, row) => sum + row.areaHa, 0);
    let meterVolume: number | undefined;
    const allocations = [] as CreateIrrigationInput["meterAllocations"];
    for (const allocation of input.meterAllocations) {
      let volumeM3 = allocation.volumeM3;
      if (allocation.startReadingId && allocation.endReadingId) {
        const rows = await tx.select().from(waterMeterReadings).where(inArray(waterMeterReadings.id, [allocation.startReadingId, allocation.endReadingId]));
        const start = rows.find((row) => row.id === allocation.startReadingId); const end = rows.find((row) => row.id === allocation.endReadingId);
        if (!start || !end || start.meterId !== allocation.meterId || end.meterId !== allocation.meterId || start.readAt >= end.readAt) throw domainError("Meter reading pair is invalid", "METER_READING_PAIR_INVALID");
        volumeM3 = readingDifference({ valueM3: number(start.valueM3) }, { valueM3: number(end.valueM3), event: end.event as "normal" | "replacement" | "reset" | "rollover" });
      }
      allocations.push({ ...allocation, volumeM3 }); meterVolume = (meterVolume || 0) + (volumeM3 || 0);
    }
    const hydraulic = deriveHydraulicValues({ areaHa, volumeM3: input.inputMode === "meter_difference" ? meterVolume : input.volumeM3, doseM3Ha: input.doseM3Ha, depthMm: input.depthMm, flowM3H: input.flowM3H, durationMinutes: input.durationMinutes });
    let analysisSnapshot: IrrigationDto["nitrateAnalysisSnapshot"];
    let analysisId = input.waterAnalysisId;
    if (analysisId) {
      const [analysis] = await tx.select().from(irrigationWaterAnalyses).where(eq(irrigationWaterAnalyses.id, analysisId));
      const links = await tx.select().from(irrigationWaterAnalysisSectors).where(eq(irrigationWaterAnalysisSectors.analysisId, analysisId));
      if (!analysis || sectorIds.some((sectorId) => !links.some((link) => link.sectorId === sectorId))) throw domainError("Water analysis is not applicable to every selected sector", "WATER_ANALYSIS_INVALID");
      const at = input.performedAt || `${input.scheduledWeekEnd}T23:59:59Z`;
      analysisSnapshot = { sampledOn: analysis.sampledOn, nitrateMgL: number(analysis.nitrateMgL), source: analysis.source || undefined, stale: isNitrateAnalysisStale(analysis.sampledOn, at) };
    } else {
      const links = await tx.select().from(irrigationWaterAnalysisSectors).where(inArray(irrigationWaterAnalysisSectors.sectorId, sectorIds));
      const ids = [...new Set(links.map((row) => row.analysisId))];
      const analyses = ids.length ? await tx.select().from(irrigationWaterAnalyses).where(inArray(irrigationWaterAnalyses.id, ids)) : [];
      const applicable = analyses.filter((analysis) => sectorIds.every((sectorId) => links.some((link) => link.analysisId === analysis.id && link.sectorId === sectorId))).sort((a, b) => b.sampledOn.localeCompare(a.sampledOn))[0];
      if (applicable) { analysisId = applicable.id; const at = input.performedAt || `${input.scheduledWeekEnd}T23:59:59Z`; analysisSnapshot = { sampledOn: applicable.sampledOn, nitrateMgL: number(applicable.nitrateMgL), source: applicable.source || undefined, stale: isNitrateAnalysisStale(applicable.sampledOn, at) }; }
    }
    return { fields, plantationRows, destinationAreas, hydraulic, allocations, analysisId, analysisSnapshot, timezone: holding.timezone };
  }

  async function materialize(tx: Tx, context: FarmRequestContext, irrigationId: string, input: CreateIrrigationInput, prepared: Awaited<ReturnType<typeof prepare>>, performedAt: Date, scheduled: boolean) {
    const operationId = randomUUID(); const code = await nextOperation(tx, context.organization.id, performedAt, prepared.timezone);
    await tx.insert(farmOperations).values({ id: operationId, organizationId: context.organization.id, code, type: input.fertigation ? "fertigation" : "irrigation", performedAt, durationMinutes: prepared.hydraulic.durationMinutes?.toString(), notes: input.notes, status: "performed" });
    const destinations = prepared.destinationAreas.map((destination) => ({ id: randomUUID(), operationId, organizationId: context.organization.id, fieldId: destination.fieldId, plantationId: destination.plantationId, areaHa: destination.areaHa.toString(), percentage: (destination.areaHa / prepared.hydraulic.areaHa * 100).toString() }));
    await tx.insert(operationDestinations).values(destinations);
    if (input.workerIds.length) await tx.insert(operationWorkers).values(input.workerIds.map((workerId) => ({ operationId, workerId, organizationId: context.organization.id })));
    if (input.equipmentIds.length) await tx.insert(operationEquipment).values(input.equipmentIds.map((equipmentId) => ({ operationId, equipmentId, organizationId: context.organization.id })));
    if (input.contractorIds.length) await tx.insert(operationContractors).values(input.contractorIds.map((contractorId) => ({ operationId, contractorId, organizationId: context.organization.id })));
    if (input.fertigation) {
      const products = input.fertigation.products.map((product) => ({ ...product, nutrientTotalsKg: calculateNutrientTotals(product), destinationApplications: destinations.map((destination) => ({ fieldId: destination.fieldId, ...(destination.plantationId ? { plantationId: destination.plantationId } : {}), dosePerHa: product.dosePerHa, totalQuantity: product.totalQuantity * Number(destination.percentage) / 100 })) }));
      await tx.insert(operationFertilizations).values({ operationId, organizationId: context.organization.id, mode: "other", customMode: "fertigation", products });
    }
    await tx.update(irrigationRecords).set({ operationId, status: scheduled ? "performed_by_schedule" : "performed", performedAt }).where(eq(irrigationRecords.id, irrigationId));
    await audit(tx, context, scheduled ? "irrigation.schedule_materialized" : "irrigation.performed", "irrigation", irrigationId, { operationId, code, volumeM3: prepared.hydraulic.volumeM3, fertigation: Boolean(input.fertigation) });
    return { operationId, code };
  }

  const repository: IrrigationRepository = {
    async overview(context) { return buildOverview(context); },
    async createSector(context, raw) { const input = createIrrigationSectorSchema.parse(raw); const id = randomUUID(); await withOrganizationTransaction(db, context.organization.id, async (tx) => { const fields = await tx.select({ id: farmFields.id, holdingId: farmFields.holdingId }).from(farmFields).where(inArray(farmFields.id, input.fieldIds)); if (fields.length !== input.fieldIds.length || fields.some((field) => field.holdingId !== input.holdingId)) throw domainError("Every sector member must be a whole field in the selected holding", "IRRIGATION_SECTOR_FIELDS_INVALID"); const assigned = await tx.select().from(irrigationSectorFields).where(inArray(irrigationSectorFields.fieldId, input.fieldIds)); if (assigned.length) throw domainError("A field already belongs to another irrigation sector", "IRRIGATION_FIELD_ALREADY_ASSIGNED", 409); await tx.insert(irrigationSectors).values({ id, organizationId: context.organization.id, holdingId: input.holdingId, code: input.code, name: input.name, system: input.system, customSystem: input.customSystem, efficiencyPercent: input.efficiencyPercent?.toString() }); await tx.insert(irrigationSectorFields).values(input.fieldIds.map((fieldId) => ({ sectorId: id, fieldId, organizationId: context.organization.id }))); await audit(tx, context, "irrigation_sector.created", "irrigation_sector", id, { fieldCount: input.fieldIds.length }); }); return (await buildOverview(context)).sectors.find((row) => row.id === id)!; },
    async createMeter(context, raw) { const input = createWaterMeterSchema.parse(raw); const id = randomUUID(); await withOrganizationTransaction(db, context.organization.id, async (tx) => { const sectors = await tx.select({ id: irrigationSectors.id, holdingId: irrigationSectors.holdingId }).from(irrigationSectors).where(inArray(irrigationSectors.id, input.sectorIds)); if (sectors.length !== input.sectorIds.length || sectors.some((sector) => sector.holdingId !== input.holdingId)) throw domainError("Meter sectors are invalid", "METER_SECTORS_INVALID"); await tx.insert(waterMeters).values({ id, organizationId: context.organization.id, holdingId: input.holdingId, code: input.code, name: input.name, serialNumber: input.serialNumber, unit: "m3" }); await tx.insert(waterMeterSectors).values(input.sectorIds.map((sectorId) => ({ meterId: id, sectorId, organizationId: context.organization.id }))); await audit(tx, context, "water_meter.created", "water_meter", id, { sectorCount: input.sectorIds.length }); }); return (await buildOverview(context)).meters.find((row) => row.id === id)!; },
    async addReading(context, meterId, raw) { const input = createMeterReadingSchema.parse(raw); const id = randomUUID(); await withOrganizationTransaction(db, context.organization.id, async (tx) => { const [meter] = await tx.select().from(waterMeters).where(eq(waterMeters.id, meterId)); if (!meter) throw domainError("Meter not found", "METER_NOT_FOUND", 404); await tx.insert(waterMeterReadings).values({ id, organizationId: context.organization.id, meterId, readAt: new Date(input.readAt), valueM3: input.valueM3.toString(), origin: input.origin, event: input.event, photoUrl: input.photoUrl, notes: input.notes }); await audit(tx, context, `water_meter_reading.${input.event}`, "water_meter_reading", id, { meterId, valueM3: input.valueM3, origin: input.origin }); }); return (await buildOverview(context)).readings.find((row) => row.id === id)!; },
    async createAnalysis(context, raw) { const input = createWaterAnalysisSchema.parse(raw); const id = randomUUID(); await withOrganizationTransaction(db, context.organization.id, async (tx) => { const sectors = await tx.select({ id: irrigationSectors.id }).from(irrigationSectors).where(inArray(irrigationSectors.id, input.sectorIds)); if (sectors.length !== input.sectorIds.length) throw domainError("Analysis sectors are invalid", "WATER_ANALYSIS_SECTORS_INVALID"); await tx.insert(irrigationWaterAnalyses).values({ id, organizationId: context.organization.id, sampledOn: input.sampledOn, nitrateMgL: input.nitrateMgL.toString(), source: input.source }); await tx.insert(irrigationWaterAnalysisSectors).values(input.sectorIds.map((sectorId) => ({ analysisId: id, sectorId, organizationId: context.organization.id }))); await audit(tx, context, "water_analysis.created", "water_analysis", id, { nitrateMgL: input.nitrateMgL, sectorCount: input.sectorIds.length }); }); return (await buildOverview(context)).analyses.find((row) => row.id === id)!; },
    async createIrrigation(context, raw) { const input = createIrrigationSchema.parse(raw); const id = randomUUID(); await withOrganizationTransaction(db, context.organization.id, async (tx) => { const prepared = await prepare(context, input, tx); await tx.insert(irrigationRecords).values({ id, organizationId: context.organization.id, status: input.kind === "weekly_schedule" ? "scheduled" : "performed", inputMode: input.inputMode, scheduledWeekEnd: input.scheduledWeekEnd, performedAt: input.performedAt ? new Date(input.performedAt) : null, areaHa: prepared.hydraulic.areaHa.toString(), volumeM3: prepared.hydraulic.volumeM3.toString(), doseM3Ha: prepared.hydraulic.doseM3Ha.toString(), depthMm: prepared.hydraulic.depthMm.toString(), flowM3H: prepared.hydraulic.flowM3H?.toString(), durationMinutes: prepared.hydraulic.durationMinutes?.toString(), applications: input.applications, meterAllocations: prepared.allocations, waterAnalysisId: prepared.analysisId, nitrateAnalysisSnapshot: prepared.analysisSnapshot, fertigationSnapshot: input.fertigation, resourceSnapshot: { workerIds: input.workerIds, equipmentIds: input.equipmentIds, contractorIds: input.contractorIds, timezone: prepared.timezone }, notes: input.notes }); if (input.kind === "performed") await materialize(tx, context, id, input, prepared, new Date(input.performedAt!), false); else await audit(tx, context, "irrigation.schedule_created", "irrigation", id, { weekEnd: input.scheduledWeekEnd!, volumeM3: prepared.hydraulic.volumeM3, fertigation: Boolean(input.fertigation) }); }); return (await buildOverview(context)).irrigations.find((row) => row.id === id)!; },
    async finalizeDue(context, now = new Date()) {
      return withOrganizationTransaction(db, context.organization.id, async (tx) => {
        const scheduledRows = await tx.select().from(irrigationRecords).where(eq(irrigationRecords.status, "scheduled")).for("update", { skipLocked: true });
        const due = scheduledRows.filter((row) => {
          const parts = dateInTimeZone(now, row.resourceSnapshot.timezone || context.organization.timezone || "Europe/Lisbon");
          const localDate = `${parts.year}-${parts.month}-${parts.day}`;
          return Boolean(row.scheduledWeekEnd && row.scheduledWeekEnd < localDate);
        });
        for (const row of due) {
          const input = createIrrigationSchema.parse({ kind: "weekly_schedule", scheduledWeekEnd: row.scheduledWeekEnd, inputMode: row.inputMode, volumeM3: number(row.volumeM3), doseM3Ha: number(row.doseM3Ha), depthMm: number(row.depthMm), flowM3H: row.flowM3H ? number(row.flowM3H) : undefined, durationMinutes: row.durationMinutes ? number(row.durationMinutes) : undefined, applications: row.applications, meterAllocations: row.meterAllocations, waterAnalysisId: row.waterAnalysisId || undefined, fertigation: row.fertigationSnapshot, workerIds: row.resourceSnapshot.workerIds, equipmentIds: row.resourceSnapshot.equipmentIds, contractorIds: row.resourceSnapshot.contractorIds, notes: row.notes || undefined });
          const prepared = await prepare(context, input, tx);
          await materialize(tx, context, row.id, input, prepared, scheduledWeekPerformedAt(row.scheduledWeekEnd!, prepared.timezone), true);
        }
        return due.length;
      });
    },
    async reverse(context, id) { const changed = await withOrganizationTransaction(db, context.organization.id, async (tx) => { const [row] = await tx.select().from(irrigationRecords).where(eq(irrigationRecords.id, id)).for("update"); if (!row) return false; if (!row.operationId || !["performed", "performed_by_schedule"].includes(row.status)) throw domainError("Only a performed irrigation can be reversed", "IRRIGATION_NOT_REVERSIBLE", 409); const reversedAt=new Date(); await tx.update(farmOperations).set({ status: "voided", voidReason: "Irrigation record reversed", voidedAt: reversedAt, voidedBy: context.user.id }).where(eq(farmOperations.id, row.operationId)); await tx.update(irrigationRecords).set({ status: "reversed", reversedAt }).where(eq(irrigationRecords.id, id)); await audit(tx, context, "irrigation.reversed", "irrigation", id, { operationId: row.operationId, derivedFertigationReversed: Boolean(row.fertigationSnapshot) }); return true; }); return changed ? (await buildOverview(context)).irrigations.find((row) => row.id === id) || null : null; },
  };
  return repository;
}
