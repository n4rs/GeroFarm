import { z } from "zod";

export const operationCatalogKinds = ["soil_action", "crop_installation_method", "cultural_work_action", "cultural_work_method"] as const;
export const operationCatalogItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(operationCatalogKinds),
  label: z.string().trim().min(2).max(120),
  status: z.enum(["active", "inactive"]),
  createdAt: z.string().datetime(),
});
export const createOperationCatalogItemSchema = operationCatalogItemSchema.pick({ kind: true, label: true });
export const setOperationCatalogStatusSchema = z.object({ active: z.boolean() });

export const resourceDestinationOverrideSchema = z.object({
  fieldId: z.string().uuid(),
  plantationId: z.string().uuid().optional(),
  hours: z.number().nonnegative().max(100000),
});
export const operationResourceAssignmentSchema = z.object({
  resourceId: z.string().uuid(),
  totalHours: z.number().positive().max(100000),
  destinationOverrides: z.array(resourceDestinationOverrideSchema).max(100).default([]),
});

export type OperationCatalogItemDto = z.infer<typeof operationCatalogItemSchema>;
export type OperationResourceAssignment = z.infer<typeof operationResourceAssignmentSchema>;
export type ResourceAllocationSnapshot = Array<{ fieldId: string; plantationId?: string; areaHa: number; hours: number; source: "effective_area" | "override" }>;

export function allocateResourceHours(totalHours: number, destinations: Array<{ fieldId: string; plantationId?: string; areaHa: number }>, overrides: OperationResourceAssignment["destinationOverrides"]): ResourceAllocationSnapshot {
  const keys = destinations.map(row => `${row.fieldId}:${row.plantationId || "field"}`);
  const overrideMap = new Map(overrides.map(row => [`${row.fieldId}:${row.plantationId || "field"}`, row.hours]));
  const invalid=(message:string)=>Object.assign(new Error(message),{status:400,code:"OPERATION_RESOURCE_ALLOCATION_INVALID"});
  if (overrideMap.size !== overrides.length || overrides.some(row => !keys.includes(`${row.fieldId}:${row.plantationId || "field"}`))) throw invalid("Resource override must identify one operation destination");
  if (overrides.length && overrides.length !== destinations.length) throw invalid("Resource overrides must cover every destination");
  if (overrides.length && Math.abs(overrides.reduce((sum, row) => sum + row.hours, 0) - totalHours) > 0.0001) throw invalid("Resource destination hours must equal total hours");
  const totalArea = destinations.reduce((sum, row) => sum + row.areaHa, 0);
  let assigned = 0;
  return destinations.map((row, index) => {
    const hours = overrides.length ? overrideMap.get(keys[index])! : index === destinations.length - 1 ? totalHours - assigned : totalHours * row.areaHa / totalArea;
    assigned += hours;
    return { ...row, hours: Math.round(hours * 10000) / 10000, source: overrides.length ? "override" : "effective_area" };
  });
}
