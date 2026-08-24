import { z } from "zod";
import { fertilizationSchema } from "./operations";

export const irrigationSystems = ["drip", "sprinkler", "gravity", "flood", "other"] as const;
export const meterStatuses = ["active", "inactive", "replaced"] as const;
export const meterReadingOrigins = ["manual", "integrated"] as const;
export const meterReadingEvents = ["normal", "replacement", "reset", "rollover"] as const;
export const irrigationStatuses = ["scheduled", "performed", "performed_by_schedule", "reversed"] as const;
export const irrigationInputModes = ["volume_total", "dose_m3_ha", "depth_mm", "flow_duration", "meter_difference"] as const;

const id = z.string().uuid();
const positive = z.number().positive().max(1_000_000_000);

export const createIrrigationSectorSchema = z.object({
  holdingId: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/),
  name: z.string().trim().min(2).max(160),
  system: z.enum(irrigationSystems),
  customSystem: z.string().trim().min(2).max(120).optional(),
  efficiencyPercent: z.number().positive().max(100).optional(),
  fieldIds: z.array(id).min(1).max(200),
}).superRefine((value, context) => {
  if (new Set(value.fieldIds).size !== value.fieldIds.length) context.addIssue({ code: "custom", path: ["fieldIds"], message: "A field can only occur once" });
  if (value.system === "other" && !value.customSystem) context.addIssue({ code: "custom", path: ["customSystem"], message: "A custom irrigation system is required" });
  if (value.system !== "other" && value.customSystem) context.addIssue({ code: "custom", path: ["customSystem"], message: "A custom system requires Other" });
});

export const createWaterMeterSchema = z.object({
  holdingId: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/),
  name: z.string().trim().min(2).max(160),
  serialNumber: z.string().trim().min(1).max(120),
  unit: z.literal("m3").default("m3"),
  sectorIds: z.array(id).min(1).max(100),
});

export const createMeterReadingSchema = z.object({
  readAt: z.string().datetime({ offset: true }),
  valueM3: z.number().nonnegative().max(10_000_000_000_000),
  origin: z.enum(meterReadingOrigins),
  event: z.enum(meterReadingEvents).default("normal"),
  photoUrl: z.string().url().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const createWaterAnalysisSchema = z.object({
  sampledOn: z.string().date(),
  nitrateMgL: z.number().nonnegative().max(100_000),
  source: z.string().trim().max(180).optional(),
  sectorIds: z.array(id).min(1).max(100),
});

export const irrigationSectorApplicationSchema = z.object({
  sectorId: id,
  fieldIds: z.array(id).min(1).max(200),
  plantationIds: z.array(id).max(200).default([]),
});

export const irrigationMeterAllocationSchema = z.object({
  meterId: id,
  startReadingId: id.optional(),
  endReadingId: id.optional(),
  volumeM3: z.number().positive().max(1_000_000_000).optional(),
}).superRefine((value, context) => {
  if ((value.startReadingId && !value.endReadingId) || (!value.startReadingId && value.endReadingId)) context.addIssue({ code: "custom", message: "Both meter readings are required" });
  if (!value.volumeM3 && !value.startReadingId) context.addIssue({ code: "custom", message: "A volume or a reading pair is required" });
});

const hydraulicValues = {
  volumeM3: positive.optional(),
  doseM3Ha: positive.optional(),
  depthMm: positive.optional(),
  flowM3H: positive.optional(),
  durationMinutes: positive.optional(),
};

export const createIrrigationSchema = z.object({
  kind: z.enum(["performed", "weekly_schedule"]),
  performedAt: z.string().datetime({ offset: true }).optional(),
  scheduledWeekEnd: z.string().date().optional(),
  inputMode: z.enum(irrigationInputModes),
  ...hydraulicValues,
  applications: z.array(irrigationSectorApplicationSchema).min(1).max(100),
  meterAllocations: z.array(irrigationMeterAllocationSchema).max(50).default([]),
  waterAnalysisId: id.optional(),
  fertigation: fertilizationSchema.optional(),
  workerIds: z.array(id).max(50).default([]),
  equipmentIds: z.array(id).max(50).default([]),
  contractorIds: z.array(id).max(20).default([]),
  notes: z.string().trim().max(2000).optional(),
}).superRefine((value, context) => {
  if (value.kind === "performed" && !value.performedAt) context.addIssue({ code: "custom", path: ["performedAt"], message: "Performed time is required" });
  if (value.kind === "weekly_schedule" && !value.scheduledWeekEnd) context.addIssue({ code: "custom", path: ["scheduledWeekEnd"], message: "The farm week end is required" });
  if (value.kind === "weekly_schedule" && value.performedAt) context.addIssue({ code: "custom", path: ["performedAt"], message: "A schedule is not yet performed" });
  const required: Record<(typeof irrigationInputModes)[number], Array<keyof typeof hydraulicValues>> = {
    volume_total: ["volumeM3"], dose_m3_ha: ["doseM3Ha"], depth_mm: ["depthMm"], flow_duration: ["flowM3H", "durationMinutes"], meter_difference: [],
  };
  for (const key of required[value.inputMode]) if (!value[key]) context.addIssue({ code: "custom", path: [key], message: "The selected hydraulic source is incomplete" });
  if (value.inputMode === "meter_difference" && !value.meterAllocations.length) context.addIssue({ code: "custom", path: ["meterAllocations"], message: "Meter readings are required" });
  const sectors = value.applications.map((row) => row.sectorId);
  if (new Set(sectors).size !== sectors.length) context.addIssue({ code: "custom", path: ["applications"], message: "A sector can only occur once per irrigation" });
});

export type CreateIrrigationSectorInput = z.infer<typeof createIrrigationSectorSchema>;
export type CreateWaterMeterInput = z.infer<typeof createWaterMeterSchema>;
export type CreateMeterReadingInput = z.infer<typeof createMeterReadingSchema>;
export type CreateWaterAnalysisInput = z.infer<typeof createWaterAnalysisSchema>;
export type CreateIrrigationInput = z.infer<typeof createIrrigationSchema>;

export type HydraulicValues = { areaHa: number; volumeM3: number; doseM3Ha: number; depthMm: number; flowM3H?: number; durationMinutes?: number };

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

export function deriveHydraulicValues(input: { areaHa: number; volumeM3?: number; doseM3Ha?: number; depthMm?: number; flowM3H?: number; durationMinutes?: number }): HydraulicValues {
  if (!(input.areaHa > 0)) throw new Error("Irrigated area must be positive");
  const candidates = [
    input.volumeM3,
    input.doseM3Ha === undefined ? undefined : input.doseM3Ha * input.areaHa,
    input.depthMm === undefined ? undefined : input.depthMm * 10 * input.areaHa,
    input.flowM3H === undefined || input.durationMinutes === undefined ? undefined : input.flowM3H * input.durationMinutes / 60,
  ].filter((value): value is number => value !== undefined);
  if (!candidates.length || candidates.some((value) => !(value > 0))) throw new Error("Volume or irrigation dose is required");
  const volumeM3 = candidates[0];
  if (candidates.some((value) => Math.abs(value - volumeM3) > Math.max(0.01, volumeM3 * 0.005))) throw new Error("Hydraulic values are inconsistent");
  const doseM3Ha = volumeM3 / input.areaHa;
  const depthMm = doseM3Ha / 10;
  const durationMinutes = input.durationMinutes ?? (input.flowM3H ? volumeM3 / input.flowM3H * 60 : undefined);
  const flowM3H = input.flowM3H ?? (durationMinutes ? volumeM3 / (durationMinutes / 60) : undefined);
  return { areaHa: round(input.areaHa), volumeM3: round(volumeM3, 3), doseM3Ha: round(doseM3Ha, 3), depthMm: round(depthMm, 3), flowM3H: flowM3H && round(flowM3H, 3), durationMinutes: durationMinutes && round(durationMinutes, 2) };
}

export function readingDifference(start: { valueM3: number }, end: { valueM3: number; event?: (typeof meterReadingEvents)[number] }) {
  if (end.event === "reset" || end.event === "replacement") throw new Error("A reset or replacement cannot be inferred across two readings");
  if (end.event === "rollover") throw new Error("A rollover requires an explicit reconciled volume because the meter maximum is unknown");
  if (end.valueM3 < start.valueM3) throw new Error("A decreasing reading requires an explicit rollover");
  return end.valueM3 - start.valueM3;
}

export function reconcileConsumption(measuredM3: number, registeredM3: number) {
  const differenceM3 = round(measuredM3 - registeredM3, 3);
  return { measuredM3: round(measuredM3, 3), registeredM3: round(registeredM3, 3), differenceM3, differencePercent: measuredM3 ? round(differenceM3 / measuredM3 * 100, 2) : null, undistributedM3: round(Math.max(0, differenceM3), 3) };
}

export function isNitrateAnalysisStale(sampledOn: string, at: string) {
  return new Date(at).getTime() - new Date(`${sampledOn}T00:00:00Z`).getTime() > 365.25 * 24 * 60 * 60 * 1000;
}

export function scheduledWeekPerformedAt(weekEnd: string, timeZone: string) {
  const [year, month, day] = weekEnd.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day, 23, 59, 59);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess += desired - represented;
  }
  return new Date(guess);
}

export type IrrigationSectorDto = CreateIrrigationSectorInput & { id: string; areaHa: number; status: "active" | "inactive"; createdAt: string };
export type WaterMeterDto = CreateWaterMeterInput & { id: string; status: (typeof meterStatuses)[number]; createdAt: string };
export type MeterReadingDto = CreateMeterReadingInput & { id: string; meterId: string; createdAt: string };
export type WaterAnalysisDto = CreateWaterAnalysisInput & { id: string; createdAt: string };
export type IrrigationDto = Omit<CreateIrrigationInput, "performedAt"> & HydraulicValues & { id: string; operationId?: string; operationCode?: string; status: (typeof irrigationStatuses)[number]; performedAt?: string; projectionKinds: Array<"operations" | "fertilization" | "plans" | "notebook">; nitrateAnalysisSnapshot?: { sampledOn: string; nitrateMgL: number; source?: string; stale: boolean }; createdAt: string };
export type IrrigationOverviewDto = { sectors: IrrigationSectorDto[]; meters: WaterMeterDto[]; readings: MeterReadingDto[]; analyses: WaterAnalysisDto[]; irrigations: IrrigationDto[]; reconciliations: Array<ReturnType<typeof reconcileConsumption> & { meterId: string }>; undistributedConsumptionM3: number };
