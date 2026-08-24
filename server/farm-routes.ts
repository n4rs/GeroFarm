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

const idSchema = z.string().uuid();

export function createFarmRouter(repository: FarmHoldingRepository, resolveContext: FarmContextResolver, fields?: FieldRepository, crops?: CropRepository, lifecycle?: CropLifecycleRepository, resources?: ResourceRepository, operations?: OperationRepository, privacy?: PrivacyRepository, fertilizationPlans?: FertilizationPlanRepository) {
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
  return router;
}
