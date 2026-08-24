import { Router } from "express";
import { z } from "zod";
import { createFarmHoldingSchema, updateFarmHoldingSchema } from "@shared/farm-holdings";
import type { FarmContextResolver } from "./farm-context";
import type { FarmHoldingRepository } from "./farm-holdings";
import { createFieldSchema, updateFieldSchema } from "@shared/fields";
import type { FieldRepository } from "./fields";
import { assertSameOrigin } from "./organization-selection";
import { createVarietySchema, cultureCatalog } from "@shared/crops";
import type { CropRepository } from "./crops";
import { closeCropPeriodSchema, createCropPeriodSchema, createFallowSchema, createPlantationSchema, uprootPlantationSchema } from "@shared/crop-lifecycle";
import type { CropLifecycleRepository } from "./crop-lifecycle";
import { createCertificateSchema,createContractorSchema,createEquipmentSchema,createWorkerSchema } from "@shared/resources";
import type { ResourceRepository } from "./resources";
import { createOperationSchema } from "@shared/operations";
import type { OperationRepository } from "./operations";
import { createPrivacyRequestSchema, reviewPrivacyRequestSchema } from "@shared/privacy";
import type { PrivacyRepository } from "./privacy";
import { createFertilizationPlanSchema } from "@shared/fertilization-plans";
import type { FertilizationPlanRepository } from "./fertilization-plans";
import { createIrrigationSchema, createIrrigationSectorSchema, createMeterReadingSchema, createWaterAnalysisSchema, createWaterMeterSchema } from "@shared/irrigation";
import type { IrrigationRepository } from "./irrigation";
import { createHarvestSchema, createLaboratoryResultSchema, createLaboratorySampleSchema, createMonitoringSchema, notebookScopeSchema } from "@shared/agronomy";
import type { AgronomyRepository } from "./agronomy";
import { consumeInventorySchema,createFarmCostSchema,createInventoryProductSchema,receiveInventorySchema,regularizeConsumptionSchema } from "@shared/economics";
import type { EconomicsRepository } from "./economics";

const idSchema = z.string().uuid();

export function createFarmRouter(repository: FarmHoldingRepository, resolveContext: FarmContextResolver, fields?: FieldRepository, crops?: CropRepository, lifecycle?: CropLifecycleRepository, resources?: ResourceRepository, operations?: OperationRepository, privacy?: PrivacyRepository, fertilizationPlans?: FertilizationPlanRepository, irrigation?: IrrigationRepository, agronomy?: AgronomyRepository, economics?: EconomicsRepository) {
  const router = Router();
  router.get("/holdings", async (req, res, next) => {
    try { const context = await resolveContext(req); res.set("cache-control", "no-store").json({ data: await repository.list(context) }); } catch (error) { next(error); }
  });
  router.post("/holdings", async (req, res, next) => {
    try { assertSameOrigin(req); const context = await resolveContext(req); const created = await repository.create(context, createFarmHoldingSchema.parse(req.body)); res.status(201).set("cache-control", "no-store").json({ data: created }); } catch (error) { next(error); }
  });
  router.patch("/holdings/:id", async (req, res, next) => {
    try { assertSameOrigin(req); const context = await resolveContext(req); const updated = await repository.update(context, idSchema.parse(req.params.id), updateFarmHoldingSchema.parse(req.body)); if (!updated) return res.status(404).json({ message: "Farm holding not found", code: "FARM_HOLDING_NOT_FOUND" }); return res.set("cache-control", "no-store").json({ data: updated }); } catch (error) { next(error); }
  });
  if (fields) {
    router.get("/fields", async (req, res, next) => { try { const context = await resolveContext(req); res.set("cache-control", "no-store").json({ data: await fields.list(context) }); } catch (error) { next(error); } });
    router.post("/fields", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const created = await fields.create(context, createFieldSchema.parse(req.body)); res.status(201).set("cache-control", "no-store").json({ data: created }); } catch (error) { next(error); } });
    router.patch("/fields/:id", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const updated = await fields.update(context, idSchema.parse(req.params.id), updateFieldSchema.parse(req.body)); if (!updated) return res.status(404).json({ message: "Field not found", code: "FIELD_NOT_FOUND" }); return res.set("cache-control", "no-store").json({ data: updated }); } catch (error) { next(error); } });
  }
  router.get("/crop-catalog", (_req, res) => res.set("cache-control", "public, max-age=3600").json({ data: cultureCatalog, provenance: { sourceRecords: 107, uniqueRecords: 106, duplicateRemoved: "Alfarrobeira", importedFields: ["name"] } }));
  if (crops) {
    router.get("/varieties", async (req, res, next) => { try { const context = await resolveContext(req); res.set("cache-control", "no-store").json({ data: await crops.listVarieties(context) }); } catch (error) { next(error); } });
    router.post("/varieties", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const created = await crops.createVariety(context, createVarietySchema.parse(req.body)); res.status(201).set("cache-control", "no-store").json({ data: created }); } catch (error) { next(error); } });
  }
  if (lifecycle) {
    router.get("/crop-lifecycle", async (req, res, next) => { try { const context = await resolveContext(req); res.set("cache-control", "no-store").json({ data: await lifecycle.list(context) }); } catch (error) { next(error); } });
    router.post("/plantations", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); res.status(201).json({ data: await lifecycle.createPlantation(context, createPlantationSchema.parse(req.body)) }); } catch (error) { next(error); } });
    router.post("/crop-periods", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); res.status(201).json({ data: await lifecycle.createPeriod(context, createCropPeriodSchema.parse(req.body)) }); } catch (error) { next(error); } });
    router.post("/crop-periods/:id/close", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const { endedOn } = closeCropPeriodSchema.parse(req.body); const data = await lifecycle.closePeriod(context, idSchema.parse(req.params.id), endedOn); if (!data) return res.status(404).json({ code: "CROP_PERIOD_NOT_FOUND" }); return res.json({ data }); } catch (error) { next(error); } });
    router.post("/plantations/:id/uproot", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const data = await lifecycle.uproot(context, idSchema.parse(req.params.id), uprootPlantationSchema.parse(req.body)); if (!data) return res.status(404).json({ code: "PERMANENT_PLANTATION_NOT_FOUND" }); return res.json({ data }); } catch (error) { next(error); } });
    router.post("/fallows", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); res.status(201).json({ data: await lifecycle.createFallow(context, createFallowSchema.parse(req.body)) }); } catch (error) { next(error); } });
    router.post("/fallows/:id/close", async (req, res, next) => { try { assertSameOrigin(req); const context = await resolveContext(req); const { endedOn } = closeCropPeriodSchema.parse(req.body); const data = await lifecycle.closeFallow(context, idSchema.parse(req.params.id), endedOn); if (!data) return res.status(404).json({ code: "FALLOW_NOT_FOUND" }); return res.json({ data }); } catch (error) { next(error); } });
  }
  if(resources){router.get("/resources",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await resources.list(context)})}catch(error){next(error)}});router.post("/workers",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await resources.createWorker(context,createWorkerSchema.parse(req.body))})}catch(error){next(error)}});router.post("/worker-certificates",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await resources.createCertificate(context,createCertificateSchema.parse(req.body))})}catch(error){next(error)}});router.post("/contractors",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await resources.createContractor(context,createContractorSchema.parse(req.body))})}catch(error){next(error)}});router.post("/equipment",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await resources.createEquipment(context,createEquipmentSchema.parse(req.body))})}catch(error){next(error)}})}
  if(operations){router.get("/operations",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await operations.list(context)})}catch(error){next(error)}});router.post("/operations",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await operations.create(context,createOperationSchema.parse(req.body))})}catch(error){next(error)}})}
  if(privacy){router.get("/privacy",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await privacy.overview(context)})}catch(error){next(error)}});router.post("/privacy/requests",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await privacy.createRequest(context,createPrivacyRequestSchema.parse(req.body))})}catch(error){next(error)}});router.get("/privacy/manage",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await privacy.manage(context)})}catch(error){next(error)}});router.patch("/privacy/requests/:id",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);const data=await privacy.review(context,idSchema.parse(req.params.id),reviewPrivacyRequestSchema.parse(req.body));if(!data)return res.status(404).json({code:"PRIVACY_REQUEST_NOT_FOUND"});return res.json({data})}catch(error){next(error)}});router.get("/privacy/export",async(req,res,next)=>{try{const context=await resolveContext(req);const data=await privacy.exportPersonalData(context);res.set({"cache-control":"no-store","content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="gerofarm-personal-data-${context.user.id}.json"`}).send(JSON.stringify(data,null,2))}catch(error){next(error)}})}
  if(fertilizationPlans){router.get("/fertilization-plans",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await fertilizationPlans.list(context)})}catch(error){next(error)}});router.post("/fertilization-plans",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await fertilizationPlans.create(context,createFertilizationPlanSchema.parse(req.body))})}catch(error){next(error)}});router.post("/fertilization-plans/:id/activate",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);const data=await fertilizationPlans.activate(context,idSchema.parse(req.params.id));if(!data)return res.status(404).json({code:"FERTILIZATION_PLAN_NOT_FOUND"});return res.json({data})}catch(error){next(error)}})}
  if(irrigation){
    router.get("/irrigation",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await irrigation.overview(context)})}catch(error){next(error)}});
    router.post("/irrigation/sectors",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await irrigation.createSector(context,createIrrigationSectorSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/irrigation/meters",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await irrigation.createMeter(context,createWaterMeterSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/irrigation/meters/:id/readings",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await irrigation.addReading(context,idSchema.parse(req.params.id),createMeterReadingSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/irrigation/water-analyses",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await irrigation.createAnalysis(context,createWaterAnalysisSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/irrigation/records",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await irrigation.createIrrigation(context,createIrrigationSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/irrigation/schedules/finalize-due",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.json({data:{finalized:await irrigation.finalizeDue(context)}})}catch(error){next(error)}});
    router.post("/irrigation/records/:id/reverse",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);const data=await irrigation.reverse(context,idSchema.parse(req.params.id));if(!data)return res.status(404).json({code:"IRRIGATION_NOT_FOUND"});return res.json({data})}catch(error){next(error)}});
  }
  if(agronomy){
    router.get("/agronomy",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await agronomy.overview(context)})}catch(error){next(error)}});
    router.post("/monitorings",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await agronomy.createMonitoring(context,createMonitoringSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/laboratory-samples",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await agronomy.createSample(context,createLaboratorySampleSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/laboratory-results",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await agronomy.createResult(context,createLaboratoryResultSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/harvests",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await agronomy.createHarvest(context,createHarvestSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/field-notebooks/current",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.json({data:await agronomy.currentNotebook(context,notebookScopeSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/field-notebooks/xlsx",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req),file=await agronomy.xlsx(context,notebookScopeSchema.parse(req.body));res.set({"cache-control":"no-store","content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="${file.filename}"`}).send(file.data)}catch(error){next(error)}});
    router.post("/field-notebooks",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await agronomy.issueNotebook(context,notebookScopeSchema.parse(req.body))})}catch(error){next(error)}});
    router.get("/field-notebooks/:id/pdf",async(req,res,next)=>{try{const context=await resolveContext(req),pdf=await agronomy.pdf(context,idSchema.parse(req.params.id));if(!pdf)return res.status(404).json({code:"NOTEBOOK_PDF_NOT_FOUND"});return res.set({"cache-control":"no-store","content-type":"application/pdf","content-disposition":`attachment; filename="${pdf.filename}"`}).send(pdf.data)}catch(error){next(error)}});
    router.delete("/field-notebooks/:id",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req),deleted=await agronomy.deleteNotebook(context,idSchema.parse(req.params.id));if(!deleted)return res.status(404).json({code:"NOTEBOOK_NOT_FOUND"});return res.status(204).end()}catch(error){next(error)}});
  }
  if(economics){
    router.get("/economics",async(req,res,next)=>{try{const context=await resolveContext(req);res.set("cache-control","no-store").json({data:await economics.overview(context)})}catch(error){next(error)}});
    router.post("/inventory/products",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await economics.createProduct(context,createInventoryProductSchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/inventory/receipts",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await economics.receive(context,receiveInventorySchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/inventory/consumptions",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await economics.consume(context,consumeInventorySchema.parse(req.body))})}catch(error){next(error)}});
    router.post("/inventory/consumptions/:id/regularize",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req),data=await economics.regularize(context,idSchema.parse(req.params.id),regularizeConsumptionSchema.parse(req.body));if(!data)return res.status(404).json({code:"CONSUMPTION_NOT_FOUND"});return res.json({data})}catch(error){next(error)}});
    router.post("/costs",async(req,res,next)=>{try{assertSameOrigin(req);const context=await resolveContext(req);res.status(201).json({data:await economics.createCost(context,createFarmCostSchema.parse(req.body))})}catch(error){next(error)}});
  }
  return router;
}
