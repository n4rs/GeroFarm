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

const idSchema = z.string().uuid();

export function createFarmRouter(repository: FarmHoldingRepository, resolveContext: FarmContextResolver, fields?: FieldRepository, crops?: CropRepository) {
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
  return router;
}
