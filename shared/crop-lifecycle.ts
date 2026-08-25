import { z } from "zod";
import { cultureIds } from "./crops";

const date = z.string().date();
const optionalDate = z.union([date, z.literal("")]).optional().transform((value) => value || undefined);
export const plantationKinds = ["permanent", "temporary"] as const;
export const createPlantationSchema = z.object({
  fieldId: z.string().uuid(), cultureId: z.string().refine((value) => cultureIds.has(value), "Unknown culture"), varietyId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160), kind: z.enum(plantationKinds), areaHa: z.number().positive().max(1_000_000), startedOn: date,
});
export const createCropPeriodSchema = z.object({ plantationId: z.string().uuid(), name: z.string().trim().min(2).max(160), startedOn: date, endedOn: optionalDate }).refine((value) => !value.endedOn || value.endedOn >= value.startedOn, { path: ["endedOn"], message: "End date precedes start date" });
export const closeCropPeriodSchema = z.object({ endedOn: date });
export const uprootPlantationSchema = z.object({ uprootedOn: date, reason: z.string().trim().min(2).max(500) });
export const createFallowSchema = z.object({ fieldId: z.string().uuid(), name: z.string().trim().min(2).max(160), areaHa: z.number().positive().max(1_000_000), startedOn: date, endedOn: optionalDate }).refine((value) => !value.endedOn || value.endedOn >= value.startedOn, { path: ["endedOn"], message: "End date precedes start date" });

export type CreatePlantationInput = z.infer<typeof createPlantationSchema>;
export type CreateCropPeriodInput = z.infer<typeof createCropPeriodSchema>;
export type CreateFallowInput = z.infer<typeof createFallowSchema>;
export type PlantationDto = CreatePlantationInput & { id: string; status: "active" | "ended" | "uprooted" | "voided"; endedOn: string | null; createdAt: string };
export type CropPeriodDto = { id: string; plantationId: string; kind: "campaign" | "cycle"; name: string; startedOn: string; endedOn: string | null; status: "active" | "closed" };
export type FallowDto = Omit<CreateFallowInput, "endedOn"> & { id: string; endedOn: string | null; status: "active" | "closed" };
export type RotationEntry = { id: string; fieldId: string; type: "plantation" | "fallow"; label: string; startedOn: string; endedOn: string | null; areaHa: number; cultureId?: string; kind?: "permanent" | "temporary" };

export class OccupancyError extends Error { readonly status = 409; readonly code = "FIELD_OCCUPANCY_EXCEEDED"; constructor(readonly availableAreaHa: number) { super("The active occupied area exceeds the usable field area"); } }
