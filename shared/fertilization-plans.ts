import { z } from "zod";
import { cultureIds } from "./crops";
import type { OperationDto } from "./operations";

export const planStatuses = ["draft", "in_force", "superseded"] as const;
export const planTargetTypes = ["current_plantation", "next_planting", "current_campaign", "next_campaign"] as const;
export const planNutrientKeys = ["nTotal", "p2o5", "k2o", "cao", "mgo", "so3"] as const;

export const nutrientAmountsSchema = z.object(Object.fromEntries(
  planNutrientKeys.map((key) => [key, z.number().nonnegative().max(1_000_000).default(0)]),
) as Record<(typeof planNutrientKeys)[number], z.ZodDefault<z.ZodNumber>>);

export const plannedSourceSchema = z.object({
  name: z.string().trim().min(1).max(180),
  nutrientsKgHa: nutrientAmountsSchema,
});

export const fertilizationPlanFieldSchema = z.object({
  fieldId: z.string().uuid(),
  plantationId: z.string().uuid().optional(),
  targetType: z.enum(planTargetTypes),
  targetLabel: z.string().trim().min(1).max(180),
  areaHa: z.number().positive().max(1_000_000),
  objectivesKgHa: nutrientAmountsSchema,
  plannedSources: z.array(plannedSourceSchema).max(30).default([]),
  irrigationSectorSnapshot: z.string().trim().max(180).optional(),
  nitrateAnalysisSnapshot: z.object({
    sampledOn: z.string().date(),
    nitrateMgL: z.number().nonnegative().max(100_000),
    source: z.string().trim().max(180).optional(),
  }).optional(),
  irrigationForecastM3Ha: z.number().nonnegative().max(10_000_000).optional(),
  includeCoverCrop: z.boolean().default(false),
  coverCropContributionKgHa: nutrientAmountsSchema.optional(),
}).superRefine((value, context) => {
  if (value.targetType !== "next_planting" && !value.plantationId) {
    context.addIssue({ code: "custom", path: ["plantationId"], message: "A current plantation target is required" });
  }
  if (!value.includeCoverCrop && value.coverCropContributionKgHa && Object.values(value.coverCropContributionKgHa).some(Boolean)) {
    context.addIssue({ code: "custom", path: ["coverCropContributionKgHa"], message: "Cover crop contribution requires its inclusion" });
  }
});

export const createFertilizationPlanSchema = z.object({
  name: z.string().trim().min(2).max(180),
  cultureId: z.string().refine((value) => cultureIds.has(value), "Unknown culture"),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  notes: z.string().trim().max(2000).optional(),
  fields: z.array(fertilizationPlanFieldSchema).min(1).max(100),
}).superRefine((value, context) => {
  if (value.endsOn < value.startsOn) context.addIssue({ code: "custom", path: ["endsOn"], message: "Plan end precedes its start" });
  const duplicates = value.fields.filter((row, index) => value.fields.findIndex((item) => item.fieldId === row.fieldId) !== index);
  if (duplicates.length) context.addIssue({ code: "custom", path: ["fields"], message: "A field can only occur once in a general plan" });
});

export type NutrientAmounts = z.infer<typeof nutrientAmountsSchema>;
export type CreateFertilizationPlanInput = z.infer<typeof createFertilizationPlanSchema>;
export type FertilizationPlanFieldDto = CreateFertilizationPlanInput["fields"][number] & {
  id: string;
  deliveredKg: NutrientAmounts;
  deliveredKgHa: NutrientAmounts;
  plannedKgHa: NutrientAmounts;
  plannedBalanceKgHa: NutrientAmounts;
  balanceKgHa: NutrientAmounts;
  unknownCompositionOperationCount: number;
  operationCount: number;
  warnings: Array<"missing_irrigation_sector" | "missing_nitrate_analysis" | "stale_nitrate_analysis" | "unknown_composition" | "objective_exceeded">;
};
export type FertilizationPlanDto = Omit<CreateFertilizationPlanInput, "fields"> & {
  id: string;
  version: number;
  status: (typeof planStatuses)[number];
  createdAt: string;
  activatedAt?: string;
  fields: FertilizationPlanFieldDto[];
};

export const emptyNutrients = (): NutrientAmounts => Object.fromEntries(planNutrientKeys.map((key) => [key, 0])) as NutrientAmounts;
const rounded = (value: number) => Math.round(value * 1000) / 1000;

export function calculatePlannedNutrients(field: Pick<FertilizationPlanFieldDto, "plannedSources" | "includeCoverCrop" | "coverCropContributionKgHa" | "objectivesKgHa">) {
  const plannedKgHa = emptyNutrients();
  for (const source of field.plannedSources) for (const key of planNutrientKeys) plannedKgHa[key] += source.nutrientsKgHa[key];
  if (field.includeCoverCrop && field.coverCropContributionKgHa) {
    for (const key of planNutrientKeys) plannedKgHa[key] += field.coverCropContributionKgHa[key];
  }
  for (const key of planNutrientKeys) plannedKgHa[key] = rounded(plannedKgHa[key]);
  const plannedBalanceKgHa = Object.fromEntries(planNutrientKeys.map((key) => [key, rounded(field.objectivesKgHa[key] - plannedKgHa[key])])) as NutrientAmounts;
  return { plannedKgHa, plannedBalanceKgHa };
}

export function calculateDeliveredNutrients(
  operations: OperationDto[],
  field: Pick<FertilizationPlanFieldDto, "fieldId" | "plantationId" | "areaHa">,
  startsOn: string,
  endsOn: string,
) {
  const deliveredKg = emptyNutrients();
  let operationCount = 0;
  let unknownCompositionOperationCount = 0;
  for (const operation of operations) {
    if (operation.status !== "performed" || !operation.fertilization) continue;
    const date = operation.performedAt.slice(0, 10);
    if (date < startsOn || date > endsOn) continue;
    const destinations = operation.destinations.filter((destination) => destination.fieldId === field.fieldId
      && (!field.plantationId || destination.plantationId === field.plantationId));
    if (!destinations.length) continue;
    let counted = false;
    let operationUnknown = false;
    for (const product of operation.fertilization.products) {
      const matchingApplications = product.destinationApplications.filter((application) => application.fieldId === field.fieldId
        && (!field.plantationId || application.plantationId === field.plantationId));
      const selectedQuantity = matchingApplications.length
        ? matchingApplications.reduce((sum, application) => sum + application.totalQuantity, 0)
        : product.totalQuantity * destinations.reduce((sum, destination) => sum + destination.percentage, 0) / 100;
      if (selectedQuantity <= 0) continue;
      counted = true;
      if (!product.compositionKnown) operationUnknown = true;
      const share = Math.min(1, selectedQuantity / product.totalQuantity);
      for (const key of planNutrientKeys) deliveredKg[key] += (product.nutrientTotalsKg[key] || 0) * share;
    }
    if (counted) operationCount += 1;
    if (operationUnknown) unknownCompositionOperationCount += 1;
  }
  for (const key of planNutrientKeys) deliveredKg[key] = rounded(deliveredKg[key]);
  const deliveredKgHa = Object.fromEntries(planNutrientKeys.map((key) => [key, rounded(deliveredKg[key] / field.areaHa)])) as NutrientAmounts;
  return { deliveredKg, deliveredKgHa, operationCount, unknownCompositionOperationCount };
}

export function planWarnings(
  field: Pick<FertilizationPlanFieldDto, "irrigationSectorSnapshot" | "nitrateAnalysisSnapshot" | "objectivesKgHa" | "deliveredKgHa" | "unknownCompositionOperationCount">,
  planEndsOn: string,
) {
  const warnings: FertilizationPlanFieldDto["warnings"] = [];
  if (!field.irrigationSectorSnapshot) warnings.push("missing_irrigation_sector");
  if (!field.nitrateAnalysisSnapshot) warnings.push("missing_nitrate_analysis");
  else {
    const ageMs = new Date(`${planEndsOn}T00:00:00Z`).getTime() - new Date(`${field.nitrateAnalysisSnapshot.sampledOn}T00:00:00Z`).getTime();
    if (ageMs > 365.25 * 24 * 60 * 60 * 1000) warnings.push("stale_nitrate_analysis");
  }
  if (field.unknownCompositionOperationCount) warnings.push("unknown_composition");
  if (planNutrientKeys.some((key) => field.deliveredKgHa[key] > field.objectivesKgHa[key] + 0.0005)) warnings.push("objective_exceeded");
  return warnings;
}
