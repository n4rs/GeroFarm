import { z } from "zod";
import { legacyCultureNames } from "./culture-catalog.generated";

export const cultureCatalog = legacyCultureNames;
export const cultureIds = new Set<string>(cultureCatalog.map(({ id }) => id));
export type CultureCatalogEntry = (typeof cultureCatalog)[number];

export const createVarietySchema = z.object({
  cultureId: z.string().refine((value) => cultureIds.has(value), "Unknown culture"),
  name: z.string().trim().min(1).max(160),
});
export type CreateVarietyInput = z.infer<typeof createVarietySchema>;
export type VarietyDto = CreateVarietyInput & { id: string; createdAt: string };

export function formatCount(template: string, count: number, locale: string) {
  return template.replace("{count}", count.toLocaleString(locale));
}
