import { z } from "zod";

export const productApplicationMethods = ["spray", "granules", "bait", "injection", "other"] as const;
export const applicationProductCategories = [
  "phytopharmaceutical",
  "foliar_fertilizer",
  "biostimulant",
  "adjuvant",
  "corrective",
  "other",
] as const;
export const productQuantitySources = ["dose_per_ha", "dose_per_hl", "total"] as const;

const nutrientSnapshotSchema = z.object({
  compositionKnown: z.boolean(),
  densityKgL: z.number().positive().max(10).optional(),
  dryMatterPercent: z.number().positive().max(100).optional(),
  composition: z.record(z.string().trim().min(1).max(40), z.number().nonnegative().max(100)).default({}),
});

export const authorizationSnapshotSchema = z.object({
  fieldId: z.string().uuid(),
  plantationId: z.string().uuid().optional(),
  cultureId: z.string().trim().min(1).max(40).optional(),
  destinationLabel: z.string().trim().min(1).max(180),
  authorized: z.boolean().optional(),
  authorizationReference: z.string().trim().max(160).optional(),
  authorizedUse: z.string().trim().max(300).optional(),
  validFrom: z.string().date().optional(),
  validUntil: z.string().date().optional(),
  safetyIntervalDays: z.number().int().nonnegative().max(3650).optional(),
  reentryHours: z.number().nonnegative().max(100000).optional(),
}).superRefine((value, context) => {
  if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
    context.addIssue({ code: "custom", path: ["validUntil"], message: "Authorization end date precedes its start" });
  }
});

export const applicationProductSchema = z.object({
  name: z.string().trim().min(1).max(180),
  category: z.enum(applicationProductCategories),
  unit: z.enum(["kg", "g", "l", "ml"]),
  quantitySource: z.enum(productQuantitySources),
  dosePerHa: z.number().positive().max(1_000_000).optional(),
  dosePerHl: z.number().positive().max(1_000_000).optional(),
  totalQuantity: z.number().positive().max(1_000_000_000).optional(),
  lotNumber: z.string().trim().max(120).optional(),
  resourceId: z.string().uuid().optional(),
  unitCost: z.number().nonnegative().max(1_000_000_000).optional(),
  totalCost: z.number().nonnegative().max(1_000_000_000_000).optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  activeSubstances: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  registrationNumber: z.string().trim().max(120).optional(),
  fracGroup: z.string().trim().max(40).optional(),
  targets: z.array(z.string().trim().min(1).max(180)).max(30).default([]),
  otherPurpose: z.string().trim().max(300).optional(),
  authorizations: z.array(authorizationSnapshotSchema).min(1).max(100),
  legalLimitExceeded: z.boolean().default(false),
  applicationLimitExceeded: z.boolean().default(false),
  antiResistanceWarning: z.boolean().default(false),
  nutrientSnapshot: nutrientSnapshotSchema.optional(),
}).superRefine((value, context) => {
  if (value.quantitySource === "dose_per_ha" && value.dosePerHa === undefined) context.addIssue({ code: "custom", path: ["dosePerHa"], message: "Dose per hectare is required" });
  if (value.quantitySource === "dose_per_hl" && value.dosePerHl === undefined) context.addIssue({ code: "custom", path: ["dosePerHl"], message: "Dose per hectolitre is required" });
  if (value.quantitySource === "total" && value.totalQuantity === undefined) context.addIssue({ code: "custom", path: ["totalQuantity"], message: "Total quantity is required" });
  if (value.category === "phytopharmaceutical" && !value.registrationNumber) context.addIssue({ code: "custom", path: ["registrationNumber"], message: "Registration snapshot is required" });
  if (value.category !== "phytopharmaceutical" && value.fracGroup) context.addIssue({ code: "custom", path: ["fracGroup"], message: "FRAC applies only to phytopharmaceutical products" });
  if (!["foliar_fertilizer", "corrective"].includes(value.category) && value.nutrientSnapshot) context.addIssue({ code: "custom", path: ["nutrientSnapshot"], message: "Nutrient composition applies only to nutrient products" });
});

export const applicationWeatherSchema = z.object({
  temperatureC: z.number().min(-80).max(80).optional(),
  relativeHumidityPercent: z.number().min(0).max(100).optional(),
  windSpeedKmh: z.number().min(0).max(500).optional(),
  windDirectionDegrees: z.number().min(0).max(360).optional(),
  precipitationMm: z.number().min(0).max(10000).optional(),
  condition: z.string().trim().max(120).optional(),
  source: z.enum(["gero_core", "manual", "unavailable"]),
  sourceObservedAt: z.string().datetime({ offset: true }).optional(),
  manuallyOverridden: z.boolean().default(false),
});

export const sprayingSchema = z.object({
  method: z.enum(productApplicationMethods),
  customMethod: z.string().trim().min(2).max(120).optional(),
  sprayVolumeLHa: z.number().positive().max(100_000).optional(),
  legalApplicatorWorkerId: z.string().uuid().optional(),
  auxiliaryWorkerIds: z.array(z.string().uuid()).max(50).default([]),
  products: z.array(applicationProductSchema).min(1).max(50),
  weather: applicationWeatherSchema,
  equipmentInspectionValid: z.boolean().optional(),
  equipmentCalibrationValid: z.boolean().optional(),
  warningsAccepted: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.method === "spray" && value.sprayVolumeLHa === undefined) context.addIssue({ code: "custom", path: ["sprayVolumeLHa"], message: "Spray volume is required" });
  if (value.method !== "spray" && value.sprayVolumeLHa !== undefined) context.addIssue({ code: "custom", path: ["sprayVolumeLHa"], message: "Spray volume belongs to spraying" });
  if (value.method === "other" && !value.customMethod) context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom method is required" });
  if (value.method !== "other" && value.customMethod) context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom method requires Other" });
  const requiresLegalApplicator = value.products.some((product) => product.category === "phytopharmaceutical");
  if (!requiresLegalApplicator && value.legalApplicatorWorkerId) context.addIssue({ code: "custom", path: ["legalApplicatorWorkerId"], message: "A legal applicator applies only to phytopharmaceutical products" });
});

export type SprayingInput = z.infer<typeof sprayingSchema>;
export type ApplicationWarningCode = "AUTHORIZATION_MISSING" | "AUTHORIZATION_OUT_OF_DATE" | "LEGAL_LIMIT" | "APPLICATION_LIMIT" | "ANTI_RESISTANCE" | "APPLICATOR_MISSING" | "APPLICATOR_INVALID" | "SPRAYER_INSPECTION" | "SPRAYER_CALIBRATION";
export type ApplicationWarning = { code: ApplicationWarningCode; productIndex?: number; destinationIndex?: number };

export function calculateApplicationQuantities(product: z.infer<typeof applicationProductSchema>, treatedAreaHa: number, sprayVolumeLHa?: number) {
  const volumeHl = treatedAreaHa * (sprayVolumeLHa ?? 0) / 100;
  const totalQuantity = product.quantitySource === "total" ? product.totalQuantity! : product.quantitySource === "dose_per_hl" ? product.dosePerHl! * volumeHl : product.dosePerHa! * treatedAreaHa;
  return { ...product, totalQuantity, dosePerHa: totalQuantity / treatedAreaHa, ...(sprayVolumeLHa ? { dosePerHl: totalQuantity / volumeHl } : {}), ...(product.unitCost!==undefined?{totalCost:product.unitCost*totalQuantity}:{}) };
}
