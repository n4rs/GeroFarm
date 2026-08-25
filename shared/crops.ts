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

export function cultureLotCode(cultureId: string) {
  const index = cultureCatalog.findIndex((culture) => culture.id === cultureId);
  if (index < 0) throw new Error("Unknown culture");
  return (index + 1).toString(36).toUpperCase().padStart(2, "0");
}

export function formatCount(template: string, count: number, locale: string) {
  return template.replace("{count}", count.toLocaleString(locale));
}
