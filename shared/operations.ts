import { z } from "zod";
import { cultureIds } from "./crops";
import { sprayingSchema, type ApplicationWarning } from "./spraying";
import { operationResourceAssignmentSchema, type OperationResourceAssignment, type ResourceAllocationSnapshot } from "./operation-extensions";
export const operationTypes = ["soil_preparation", "crop_installation", "cultural_work", "fertilization", "spraying", "product_application", "irrigation", "fertigation", "monitoring", "harvest", "other"] as const;
export const soilPreparationActionIds = ["subsoiling", "ploughing", "scarifying", "harrowing", "rotary_tilling", "levelling", "bed_forming", "furrow_opening", "stone_removal", "residue_shredding", "residue_incorporation", "solarisation"] as const;
export const soilConditions = ["dry", "moist", "wet"] as const;
export const residueDestinations = ["left", "shredded", "incorporated", "removed", "burned", "other"] as const;
export const cropInstallationMethods = ["sowing", "transplanting", "planting", "other"] as const;
export const culturalWorkActionIds = ["training_pruning", "production_pruning", "renewal_pruning", "sanitary_pruning", "green_pruning", "topping", "defoliation", "sucker_removal", "manual_weeding", "mechanical_weeding", "thermal_weeding", "plant_thinning", "flower_thinning", "fruit_thinning", "mowing", "cover_crop_cutting", "staking", "tying", "trellis_maintenance", "manual_pollination", "cleaning", "residue_removal", "mulching", "replanting"] as const;
export const culturalWorkMethods = ["manual", "mechanical", "thermal", "other"] as const;
export const workIntensities = ["light", "medium", "severe"] as const;
export const fertilizationModes = ["base", "top_dressing", "foliar", "amendment", "organic_matter", "cover_crop_incorporation", "other"] as const;
export const nutrientKeys = ["nTotal", "nNitrate", "nAmmonium", "nUreic", "nOrganic", "p2o5", "k2o", "cao", "mgo", "so3", "organicMatter", "carbon"] as const;
export const operationDestinationSchema = z.object({ fieldId: z.string().uuid(), plantationId: z.string().uuid().optional(), areaHa: z.number().positive().max(1000000), percentage: z.number().positive().max(100) });
export const soilPreparationSchema = z.object({ actions: z.array(z.string().trim().min(2).max(120)).min(1).max(20), soilAnalysisResultId: z.string().uuid().optional(), depthCm: z.number().positive().max(300).optional(), passes: z.number().int().positive().max(100).optional(), soilCondition: z.enum(soilConditions).optional(), residueDestination: z.enum(residueDestinations).optional() });
export const installationMaterialLotSchema = z.object({ varietyId: z.string().uuid().optional(), lotNumber: z.string().trim().min(1).max(120), quantity: z.number().positive().max(1000000000), unit: z.string().trim().min(1).max(24), origin: z.string().trim().max(160).optional(), supplier: z.string().trim().max(160).optional() });
export const cropInstallationSchema = z.object({ plantationName: z.string().trim().min(2).max(160), cultureId: z.string().refine(value => cultureIds.has(value), "Unknown culture"), varietyIds: z.array(z.string().uuid()).max(20).default([]), varietyDensities: z.array(z.object({ varietyId: z.string().uuid(), densityPlantsHa: z.number().positive().max(100000000) })).max(20).default([]), kind: z.enum(["permanent", "temporary"]), endedOn: z.string().date().optional(), method: z.enum(cropInstallationMethods), customMethod: z.string().trim().min(2).max(120).optional(), densityPlantsHa: z.number().positive().max(100000000), rowSpacingCm: z.number().positive().max(100000).optional(), plantSpacingCm: z.number().positive().max(100000).optional(), materialLots: z.array(installationMaterialLotSchema).max(50).default([]), predecessor: z.string().trim().max(160).optional(), preparatoryOperationIds: z.array(z.string().uuid()).max(50).default([]) }).superRefine((value, context) => { if (value.method === "other" && !value.customMethod)
    context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom installation method is required" }); if (value.method !== "other" && value.customMethod)
    context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom method requires Other" }); for (const item of value.varietyDensities)
    if (!value.varietyIds.includes(item.varietyId))
        context.addIssue({ code: "custom", path: ["varietyDensities"], message: "Density variety must be selected" }); for (const lot of value.materialLots)
    if (lot.varietyId && !value.varietyIds.includes(lot.varietyId))
        context.addIssue({ code: "custom", path: ["materialLots"], message: "Lot variety must be selected" }); });
export const culturalWorkSchema = z.object({ actions: z.array(z.string().trim().min(2).max(120)).min(1).max(30), method: z.enum(culturalWorkMethods), customMethod: z.string().trim().min(2).max(120).optional(), intensity: z.enum(workIntensities).optional(), intensityPercentage: z.number().positive().max(100).optional(), biomassDestination: z.enum(residueDestinations).optional(), plantPercentage: z.number().positive().max(100).optional(), plantCount: z.number().int().positive().max(1000000000).optional(), materials: z.array(z.object({ name: z.string().trim().min(1).max(160), quantity: z.number().positive().max(1000000000), unit: z.string().trim().min(1).max(24), lotNumber: z.string().trim().max(120).optional() })).max(50).default([]), replanting: z.object({ originalDensityPlantsHa: z.number().positive().max(100000000), plantsReplaced: z.number().int().nonnegative().max(1000000000), plantsPlaced: z.number().int().positive().max(1000000000), estimatedCurrentDensityPlantsHa: z.number().positive().max(100000000).optional() }).optional() }).superRefine((value, context) => { if (value.method === "other" && !value.customMethod)
    context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom execution method is required" }); if (value.method !== "other" && value.customMethod)
    context.addIssue({ code: "custom", path: ["customMethod"], message: "A custom method requires Other" }); if (value.actions.includes("replanting") && !value.replanting)
    context.addIssue({ code: "custom", path: ["replanting"], message: "Replanting details are required" }); if (!value.actions.includes("replanting") && value.replanting)
    context.addIssue({ code: "custom", path: ["replanting"], message: "Replanting details require replanting work" }); });
const nutrientCompositionSchema = z.object({ ...(Object.fromEntries(nutrientKeys.map(key => [key, z.number().nonnegative().max(100).optional()])) as Record<(typeof nutrientKeys)[number], z.ZodOptional<z.ZodNumber>>), micronutrients: z.record(z.string().trim().min(1).max(24), z.number().nonnegative().max(100)).default({}) });
export const fertilizationProductSchema = z.object({ name: z.string().trim().min(1).max(180), category: z.enum(["fertilizer", "amendment", "organic"]), quantitySource: z.enum(["dose_per_ha", "total"]), dosePerHa: z.number().positive().max(1000000), totalQuantity: z.number().positive().max(1000000000), unit: z.enum(["kg", "l", "t"]), densityKgL: z.number().positive().max(10).optional(), lotNumber: z.string().trim().max(120).optional(), compositionKnown: z.boolean(), dryMatterPercent: z.number().positive().max(100).optional(), composition: nutrientCompositionSchema, destinationApplications: z.array(z.object({ fieldId: z.string().uuid(), plantationId: z.string().uuid().optional(), dosePerHa: z.number().positive().max(1000000), totalQuantity: z.number().positive().max(1000000000) })).max(100).default([]), nutrientTotalsKg: z.record(z.string(), z.number().nonnegative()).default({}) }).superRefine((value, context) => { if (!value.compositionKnown && (nutrientKeys.some(key => value.composition[key] !== undefined) || Object.keys(value.composition.micronutrients).length > 0))
    context.addIssue({ code: "custom", path: ["composition"], message: "Unknown composition cannot contain nutrient values" }); if (value.category === "organic" && value.compositionKnown && !value.dryMatterPercent)
    context.addIssue({ code: "custom", path: ["dryMatterPercent"], message: "Dry matter is required for analysed organic material" }); if (value.unit === "l" && value.compositionKnown && !value.densityKgL)
    context.addIssue({ code: "custom", path: ["densityKgL"], message: "Density is required for liquid nutrient calculations" }); });
export const fertilizationSchema = z.object({ mode: z.enum(fertilizationModes), customMode: z.string().trim().min(2).max(120).optional(), products: z.array(fertilizationProductSchema).min(1).max(50) }).superRefine((value, context) => { if (value.mode === "other" && !value.customMode)
    context.addIssue({ code: "custom", path: ["customMode"], message: "A custom fertilization mode is required" }); if (value.mode !== "other" && value.customMode)
    context.addIssue({ code: "custom", path: ["customMode"], message: "A custom mode requires Other" }); });
export const createOperationSchema = z.object({ destinations: z.array(operationDestinationSchema).min(1).max(100).superRefine((rows, context) => { const total = rows.reduce((sum, row) => sum + row.percentage, 0); if (Math.abs(total - 100) > 0.01)
        context.addIssue({ code: "custom", message: "Destination percentages must total 100" }); const keys=rows.map(row=>`${row.fieldId}:${row.plantationId||"field"}`); if(new Set(keys).size!==keys.length) context.addIssue({code:"custom",message:"A physical destination can only occur once per operation"}); }), type: z.enum(operationTypes), performedAt: z.string().datetime({ offset: true }), durationMinutes: z.number().int().positive().max(10080).optional(), notes: z.string().trim().max(2000).optional(), workerIds: z.array(z.string().uuid()).max(50).default([]), equipmentIds: z.array(z.string().uuid()).max(50).default([]), contractorIds: z.array(z.string().uuid()).max(20).default([]), workerAssignments: z.array(operationResourceAssignmentSchema).max(50).default([]), equipmentAssignments: z.array(operationResourceAssignmentSchema).max(50).default([]), contractorAssignments: z.array(operationResourceAssignmentSchema).max(20).default([]), soilPreparation: soilPreparationSchema.optional(), cropInstallation: cropInstallationSchema.optional(), culturalWork: culturalWorkSchema.optional(), fertilization: fertilizationSchema.optional(), spraying: sprayingSchema.optional() }).superRefine((value, context) => {
    if (["irrigation", "fertigation"].includes(value.type))
        context.addIssue({ code: "custom", path: ["type"], message: "Irrigation and fertigation require the dedicated irrigation endpoint" });
    if (value.type === "soil_preparation" && !value.soilPreparation)
        context.addIssue({ code: "custom", path: ["soilPreparation"], message: "Soil preparation details are required" }); if (value.type !== "soil_preparation" && value.soilPreparation)
    context.addIssue({ code: "custom", path: ["soilPreparation"], message: "Soil preparation details require the matching operation type" }); if (value.type === "crop_installation" && !value.cropInstallation)
    context.addIssue({ code: "custom", path: ["cropInstallation"], message: "Crop installation details are required" }); if (value.type !== "crop_installation" && value.cropInstallation)
    context.addIssue({ code: "custom", path: ["cropInstallation"], message: "Crop installation details require the matching operation type" }); if (value.type === "cultural_work" && !value.culturalWork)
    context.addIssue({ code: "custom", path: ["culturalWork"], message: "Cultural work details are required" }); if (value.type !== "cultural_work" && value.culturalWork)
    context.addIssue({ code: "custom", path: ["culturalWork"], message: "Cultural work details require the matching operation type" }); if (value.type === "fertilization" && !value.fertilization)
    context.addIssue({ code: "custom", path: ["fertilization"], message: "Fertilization details are required" }); if (!["fertilization", "soil_preparation"].includes(value.type) && value.fertilization)
    context.addIssue({ code: "custom", path: ["fertilization"], message: "Fertilization details require the matching operation type" });
    if (["spraying", "product_application"].includes(value.type) && !value.spraying)
        context.addIssue({ code: "custom", path: ["spraying"], message: "Product application details are required" });
    if (!["spraying", "product_application"].includes(value.type) && value.spraying)
        context.addIssue({ code: "custom", path: ["spraying"], message: "Product application details require the matching operation type" });
    if (value.type === "spraying" && value.spraying?.method !== "spray")
        context.addIssue({ code: "custom", path: ["spraying", "method"], message: "A spraying operation uses the spray method" });
    if (value.type === "product_application" && value.spraying?.method === "spray")
        context.addIssue({ code: "custom", path: ["spraying", "method"], message: "Use Spraying for spray applications" });
    if (value.cropInstallation && (value.destinations.length !== 1 || value.destinations[0].plantationId))
    context.addIssue({ code: "custom", path: ["destinations"], message: "Crop installation creates exactly one new plantation" }); if (value.cropInstallation?.endedOn && value.cropInstallation.endedOn < value.performedAt.slice(0, 10))
    context.addIssue({ code: "custom", path: ["cropInstallation", "endedOn"], message: "Installation end date precedes its start" }); });
export const voidOperationSchema = z.object({ reason: z.string().trim().min(2).max(500) });
export type CreateOperationInput = z.infer<typeof createOperationSchema>;
export type OperationDto = Omit<CreateOperationInput, "workerIds" | "equipmentIds" | "contractorIds" | "workerAssignments" | "equipmentAssignments" | "contractorAssignments"> & {
    id: string;
    code: string;
    status: "performed" | "voided";
    voidReason?: string;
    voidedAt?: string;
    voidedBy?: string;
    workerIds: string[];
    equipmentIds: string[];
    contractorIds: string[];
    resourceAllocations?: { workers: Array<OperationResourceAssignment & { allocations: ResourceAllocationSnapshot }>; equipment: Array<OperationResourceAssignment & { allocations: ResourceAllocationSnapshot }>; contractors: Array<OperationResourceAssignment & { allocations: ResourceAllocationSnapshot }> };
    soilAnalysisSnapshot?: { resultId: string; sampleId: string; sampledOn: string; resultedOn: string; validUntil?: string; laboratory: string; bulletinNumber: string; results: Array<Record<string, unknown>> };
    soilAnalysisWarnings?: Array<"missing_valid_analysis">;
    createdAt: string;
    createdPlantationId?: string;
    applicationWarnings?: ApplicationWarning[];
};
export function calculateNutrientTotals(product: z.infer<typeof fertilizationProductSchema>) { if (!product.compositionKnown)
    return {}; const massKg = product.totalQuantity * (product.unit === "t" ? 1000 : product.unit === "l" ? product.densityKgL! : 1) * (product.category === "organic" ? product.dryMatterPercent! / 100 : 1); return Object.fromEntries([...nutrientKeys.flatMap(key => product.composition[key] === undefined ? [] : [[key, massKg * product.composition[key]! / 100]]), ...Object.entries(product.composition.micronutrients).map(([key, value]) => [`micro:${key}`, massKg * value / 100])]); }
