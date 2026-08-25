import { z } from "zod";

export const operationCatalogKinds = ["soil_action", "crop_installation_method", "cultural_work_action", "cultural_work_method"] as const;
export const canonicalCatalogLabel=(value:string)=>value.trim().replace(/\s+/gu," ");
export const normalizedCatalogLabel=(value:string)=>canonicalCatalogLabel(value).toLocaleLowerCase("en-US");
export const operationCatalogItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(operationCatalogKinds),
  label: z.string().transform(canonicalCatalogLabel).pipe(z.string().min(2).max(120)),
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
export type SoilAnalysisSampleCandidate={id:string;sampledOn:string;fieldIds:string[]};
export type SoilAnalysisResultCandidate={id:string;sampleId:string;resultedOn:string;validUntil:string|null};
export type SoilAnalysisChoice={fieldId:string;resultId:string};
export function selectSoilAnalysesByField(input:{fieldIds:string[];operationDate:string;samples:SoilAnalysisSampleCandidate[];results:SoilAnalysisResultCandidate[];choices:SoilAnalysisChoice[];legacyResultId?:string}){
  const invalid=(message:string)=>Object.assign(new Error(message),{status:409,code:"SOIL_ANALYSIS_NOT_VALID"});
  const fieldIds=[...new Set(input.fieldIds)],choiceMap=new Map(input.choices.map(choice=>[choice.fieldId,choice.resultId]));
  if(choiceMap.size!==input.choices.length||input.choices.some(choice=>!fieldIds.includes(choice.fieldId)))throw invalid("Soil analysis choices must identify distinct operation fields");
  const validFor=(result:SoilAnalysisResultCandidate,fieldId:string)=>{const sample=input.samples.find(row=>row.id===result.sampleId);return Boolean(sample&&sample.fieldIds.includes(fieldId)&&sample.sampledOn<=input.operationDate&&result.resultedOn<=input.operationDate&&(!result.validUntil||result.validUntil>=input.operationDate));};
  if(input.legacyResultId){if(input.choices.length)throw invalid("Legacy and per-field soil analysis choices cannot be combined");const result=input.results.find(row=>row.id===input.legacyResultId);if(!result||fieldIds.some(fieldId=>!validFor(result,fieldId)))throw invalid("Legacy soil analysis must cover every operation field");return{selections:fieldIds.map(fieldId=>({fieldId,resultId:result.id})),warnings:[] as Array<{fieldId:string;code:"missing_valid_analysis"}>};}
  const selections:Array<{fieldId:string;resultId:string}>=[],warnings:Array<{fieldId:string;code:"missing_valid_analysis"}>=[];
  for(const fieldId of fieldIds){const explicit=choiceMap.get(fieldId),candidates=input.results.filter(result=>validFor(result,fieldId)).sort((a,b)=>b.resultedOn.localeCompare(a.resultedOn));if(explicit){const result=candidates.find(row=>row.id===explicit);if(!result)throw invalid("Selected soil analysis is not valid for its field and operation date");selections.push({fieldId,resultId:result.id});}else if(candidates[0])selections.push({fieldId,resultId:candidates[0].id});else warnings.push({fieldId,code:"missing_valid_analysis"});}
  return{selections,warnings};
}

export function allocateResourceHours(totalHours: number, destinations: Array<{ fieldId: string; plantationId?: string; areaHa: number }>, overrides: OperationResourceAssignment["destinationOverrides"]): ResourceAllocationSnapshot {
  const scale=10000,toUnits=(value:number)=>Math.round(value*scale),totalUnits=toUnits(totalHours);
  const keys = destinations.map(row => `${row.fieldId}:${row.plantationId || "field"}`);
  const overrideMap = new Map(overrides.map(row => [`${row.fieldId}:${row.plantationId || "field"}`, row.hours]));
  const invalid=(message:string)=>Object.assign(new Error(message),{status:400,code:"OPERATION_RESOURCE_ALLOCATION_INVALID"});
  if (overrideMap.size !== overrides.length || overrides.some(row => !keys.includes(`${row.fieldId}:${row.plantationId || "field"}`))) throw invalid("Resource override must identify one operation destination");
  if (overrides.length && overrides.length !== destinations.length) throw invalid("Resource overrides must cover every destination");
  if(totalUnits<=0)throw invalid("Resource total hours must remain positive at four-decimal precision");
  if (overrides.length && overrides.reduce((sum,row)=>sum+toUnits(row.hours),0)!==totalUnits) throw invalid("Resource destination hours must equal total hours at four-decimal precision");
  const totalArea = destinations.reduce((sum, row) => sum + row.areaHa, 0);
  let assignedUnits = 0;
  return destinations.map((row, index) => {
    const units = overrides.length ? toUnits(overrideMap.get(keys[index])!) : index === destinations.length - 1 ? totalUnits-assignedUnits : Math.min(Math.round(totalUnits*row.areaHa/totalArea),totalUnits-assignedUnits);
    assignedUnits += units;
    return { ...row, hours: units/scale, source: overrides.length ? "override" : "effective_area" };
  });
}
