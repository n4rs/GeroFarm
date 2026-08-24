import { z } from "zod";
import { cultureIds } from "./crops";

export const operationTypes = ["soil_preparation", "crop_installation", "cultural_work", "fertilization", "spraying", "irrigation", "fertigation", "monitoring", "harvest", "other"] as const;
export const soilPreparationActionIds = ["subsoiling", "ploughing", "scarifying", "harrowing", "rotary_tilling", "levelling", "bed_forming", "furrow_opening", "stone_removal", "residue_shredding", "residue_incorporation", "solarisation"] as const;
export const soilConditions = ["dry", "moist", "wet"] as const;
export const residueDestinations = ["left", "shredded", "incorporated", "removed", "burned", "other"] as const;
export const cropInstallationMethods = ["sowing", "transplanting", "planting", "other"] as const;

export const operationDestinationSchema = z.object({ fieldId: z.string().uuid(), plantationId: z.string().uuid().optional(), areaHa: z.number().positive().max(1_000_000), percentage: z.number().positive().max(100) });
export const soilPreparationSchema = z.object({ actions: z.array(z.string().trim().min(2).max(120)).min(1).max(20), depthCm: z.number().positive().max(300).optional(), passes: z.number().int().positive().max(100).optional(), soilCondition: z.enum(soilConditions).optional(), residueDestination: z.enum(residueDestinations).optional() });
export const installationMaterialLotSchema = z.object({ varietyId: z.string().uuid().optional(), lotNumber: z.string().trim().min(1).max(120), quantity: z.number().positive().max(1_000_000_000), unit: z.string().trim().min(1).max(24), origin: z.string().trim().max(160).optional(), supplier: z.string().trim().max(160).optional() });
export const cropInstallationSchema = z.object({
  plantationName: z.string().trim().min(2).max(160), cultureId: z.string().refine((value) => cultureIds.has(value), "Unknown culture"), varietyIds: z.array(z.string().uuid()).max(20).default([]), varietyDensities: z.array(z.object({ varietyId: z.string().uuid(), densityPlantsHa: z.number().positive().max(100_000_000) })).max(20).default([]), kind: z.enum(["permanent", "temporary"]), endedOn: z.string().date().optional(), method: z.enum(cropInstallationMethods), customMethod: z.string().trim().min(2).max(120).optional(), densityPlantsHa: z.number().positive().max(100_000_000), rowSpacingCm: z.number().positive().max(100_000).optional(), plantSpacingCm: z.number().positive().max(100_000).optional(), materialLots: z.array(installationMaterialLotSchema).max(50).default([]), predecessor: z.string().trim().max(160).optional(), preparatoryOperationIds: z.array(z.string().uuid()).max(50).default([]),
}).superRefine((value, context) => { if (value.method === "other" && !value.customMethod) context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom installation method is required" }); if (value.method !== "other" && value.customMethod) context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom method requires Other" }); for (const item of value.varietyDensities) if (!value.varietyIds.includes(item.varietyId)) context.addIssue({ code: "custom", path: ["varietyDensities"], message: "Density variety must be selected" }); for (const lot of value.materialLots) if (lot.varietyId && !value.varietyIds.includes(lot.varietyId)) context.addIssue({ code: "custom", path: ["materialLots"], message: "Lot variety must be selected" }); });

export const createOperationSchema = z.object({
  destinations: z.array(operationDestinationSchema).min(1).max(100).superRefine((rows, context) => { const total = rows.reduce((sum, row) => sum + row.percentage, 0); if (Math.abs(total - 100) > 0.01) context.addIssue({ code: "custom", message: "Destination percentages must total 100" }); }),
  type: z.enum(operationTypes), performedAt: z.string().datetime({ offset: true }), durationMinutes: z.number().int().positive().max(10080).optional(), notes: z.string().trim().max(2000).optional(), workerIds: z.array(z.string().uuid()).max(50).default([]), equipmentIds: z.array(z.string().uuid()).max(50).default([]), contractorIds: z.array(z.string().uuid()).max(20).default([]), soilPreparation: soilPreparationSchema.optional(), cropInstallation: cropInstallationSchema.optional(),
}).superRefine((value, context) => {
  if (value.type === "soil_preparation" && !value.soilPreparation) context.addIssue({ code: "custom", path: ["soilPreparation"], message: "Soil preparation details are required" });
  if (value.type !== "soil_preparation" && value.soilPreparation) context.addIssue({ code: "custom", path: ["soilPreparation"], message: "Soil preparation details require the matching operation type" });
  if (value.type === "crop_installation" && !value.cropInstallation) context.addIssue({ code: "custom", path: ["cropInstallation"], message: "Crop installation details are required" });
  if (value.type !== "crop_installation" && value.cropInstallation) context.addIssue({ code: "custom", path: ["cropInstallation"], message: "Crop installation details require the matching operation type" });
  if (value.cropInstallation && (value.destinations.length !== 1 || value.destinations[0].plantationId)) context.addIssue({ code: "custom", path: ["destinations"], message: "Crop installation creates exactly one new plantation" });
  if (value.cropInstallation?.endedOn && value.cropInstallation.endedOn < value.performedAt.slice(0, 10)) context.addIssue({ code: "custom", path: ["cropInstallation", "endedOn"], message: "Installation end date precedes its start" });
});

export type CreateOperationInput = z.infer<typeof createOperationSchema>;
export type OperationDto = Omit<CreateOperationInput, "workerIds" | "equipmentIds" | "contractorIds"> & { id: string; code: string; status: "performed" | "voided"; workerIds: string[]; equipmentIds: string[]; contractorIds: string[]; createdAt: string; createdPlantationId?: string };
