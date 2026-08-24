import { z } from "zod";

export const farmHoldingStatusSchema = z.enum(["active", "inactive"]);

export function normalizeFarmHoldingCode(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

export const createFarmHoldingSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().transform(normalizeFarmHoldingCode).pipe(z.string().min(2).max(12).regex(/^[A-Z0-9]+$/)),
  timezone: z.string().trim().max(64).refine(isTimeZone, "Invalid IANA timezone"),
});

export const updateFarmHoldingSchema = createFarmHoldingSchema.partial().extend({ status: farmHoldingStatusSchema.optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateFarmHoldingInput = z.infer<typeof createFarmHoldingSchema>;
export type UpdateFarmHoldingInput = z.infer<typeof updateFarmHoldingSchema>;

export type FarmHoldingDto = {
  id: string;
  code: string;
  name: string;
  timezone: string;
  status: z.infer<typeof farmHoldingStatusSchema>;
  createdAt: string;
  updatedAt: string;
};
