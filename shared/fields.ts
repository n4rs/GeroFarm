import { z } from "zod";
import { farmHoldingStatusSchema } from "./farm-holdings";

const positionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const ringSchema = z.array(positionSchema).min(4).max(10_000).superRefine((ring, context) => {
  const first = ring[0]; const last = ring.at(-1);
  if (!last || first[0] !== last[0] || first[1] !== last[1]) context.addIssue({ code: "custom", message: "Polygon ring must be closed" });
  const unique = new Set(ring.slice(0, -1).map(([longitude, latitude]) => `${longitude},${latitude}`));
  if (unique.size < 3) context.addIssue({ code: "custom", message: "Polygon requires three distinct positions" });
});

export const fieldPolygonSchema = z.object({ type: z.literal("Polygon"), coordinates: z.tuple([ringSchema]) });
export type FieldPolygon = z.infer<typeof fieldPolygonSchema>;

export function normalizeFieldCode(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length <= 4 ? normalized.padStart(4, "0") : normalized;
}

export const createFieldSchema = z.object({
  holdingId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().transform(normalizeFieldCode).pipe(z.string().length(4).regex(/^[A-Z0-9]+$/).refine((value) => value !== "0MIX", "Reserved code")),
  geometry: fieldPolygonSchema,
  usableAreaHa: z.number().positive().max(10_000).optional(),
  manuallyClosed: z.boolean().optional().default(false),
});

export const updateFieldSchema = createFieldSchema.partial().extend({ status: farmHoldingStatusSchema.optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

export type FieldDto = { id: string; holdingId: string; code: string; name: string; geometry: FieldPolygon; totalAreaHa: number; usableAreaHa: number; occupiedAreaHa: number; freeAreaHa: number; manuallyClosed: boolean; status: "active" | "inactive"; codeLocked: boolean; createdAt: string; updatedAt: string };
