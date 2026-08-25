CREATE TABLE "farm"."operation_catalog_items" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "kind" varchar(40) NOT NULL,
  "label" varchar(120) NOT NULL,
  "normalized_label" varchar(120) GENERATED ALWAYS AS (lower(regexp_replace(btrim("label"), '[[:space:]]+', ' ', 'g'))) STORED,
  "status" varchar(16) NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "operation_catalog_items_kind_valid" CHECK ("kind" IN ('soil_action','crop_installation_method','cultural_work_action','cultural_work_method')),
  CONSTRAINT "operation_catalog_items_status_valid" CHECK ("status" IN ('active','inactive')),
  CONSTRAINT "operation_catalog_items_org_kind_label_unique" UNIQUE ("organization_id","kind","normalized_label")
);
ALTER TABLE "farm"."operation_catalog_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."operation_catalog_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "operation_catalog_items_tenant_isolation" ON "farm"."operation_catalog_items" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
GRANT SELECT, INSERT ON "farm"."operation_catalog_items" TO "gero_farm_app";
GRANT UPDATE ("status","updated_at") ON "farm"."operation_catalog_items" TO "gero_farm_app";
REVOKE DELETE ON "farm"."operation_catalog_items" FROM PUBLIC, "gero_farm_app";
CREATE FUNCTION "farm"."protect_operation_catalog_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.label IS DISTINCT FROM OLD.label OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'operation catalogue identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "operation_catalog_identity_guard" BEFORE UPDATE ON "farm"."operation_catalog_items" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_operation_catalog_identity"();
--> statement-breakpoint
INSERT INTO "farm"."operation_catalog_items" (id,organization_id,kind,label)
SELECT gen_random_uuid(),soil.organization_id,'soil_action',action
FROM "farm"."operation_soil_preparations" soil CROSS JOIN LATERAL jsonb_array_elements_text(soil.actions) action
WHERE action NOT IN ('subsoiling','ploughing','scarifying','harrowing','rotary_tilling','levelling','bed_forming','furrow_opening','stone_removal','residue_shredding','residue_incorporation','solarisation')
ON CONFLICT DO NOTHING;
INSERT INTO "farm"."operation_catalog_items" (id,organization_id,kind,label)
SELECT gen_random_uuid(),installation.organization_id,'crop_installation_method',installation.custom_method FROM "farm"."operation_crop_installations" installation WHERE installation.custom_method IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO "farm"."operation_catalog_items" (id,organization_id,kind,label)
SELECT gen_random_uuid(),work.organization_id,'cultural_work_action',action FROM "farm"."operation_cultural_works" work CROSS JOIN LATERAL jsonb_array_elements_text(work.actions) action
WHERE action NOT IN ('training_pruning','production_pruning','renewal_pruning','sanitary_pruning','green_pruning','topping','defoliation','sucker_removal','manual_weeding','mechanical_weeding','thermal_weeding','plant_thinning','flower_thinning','fruit_thinning','mowing','cover_crop_cutting','staking','tying','trellis_maintenance','manual_pollination','cleaning','residue_removal','mulching','replanting')
ON CONFLICT DO NOTHING;
INSERT INTO "farm"."operation_catalog_items" (id,organization_id,kind,label)
SELECT gen_random_uuid(),work.organization_id,'cultural_work_method',work.custom_method FROM "farm"."operation_cultural_works" work WHERE work.custom_method IS NOT NULL ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "farm"."operation_soil_preparations" ADD COLUMN "soil_analysis_snapshots" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "farm"."operation_soil_preparations" ADD COLUMN "analysis_warnings" jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE "farm"."operation_soil_preparations" soil SET "analysis_warnings"=coalesce((SELECT jsonb_agg(jsonb_build_object('fieldId',fields.field_id,'code','missing_valid_analysis')) FROM (SELECT DISTINCT destination.field_id FROM "farm"."operation_destinations" destination WHERE destination.operation_id=soil.operation_id) fields),'[]'::jsonb);
ALTER TABLE "farm"."operation_soil_preparations" ADD CONSTRAINT "operation_soil_analysis_arrays_valid" CHECK (jsonb_typeof(soil_analysis_snapshots)='array' AND jsonb_typeof(analysis_warnings)='array');
CREATE FUNCTION "farm"."validate_soil_analysis_coverage"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE destination_count integer; coverage_count integer;
BEGIN
  SELECT count(DISTINCT field_id) INTO destination_count FROM "farm"."operation_destinations" WHERE operation_id=NEW.operation_id;
  SELECT count(DISTINCT field_id) INTO coverage_count FROM (
    SELECT (item->>'fieldId')::uuid field_id FROM jsonb_array_elements(NEW.soil_analysis_snapshots) item
    UNION ALL
    SELECT (item->>'fieldId')::uuid field_id FROM jsonb_array_elements(NEW.analysis_warnings) item
  ) covered;
  IF jsonb_array_length(NEW.soil_analysis_snapshots)+jsonb_array_length(NEW.analysis_warnings)<>destination_count OR coverage_count<>destination_count
     OR EXISTS (
       SELECT 1 FROM (
         SELECT (item->>'fieldId')::uuid field_id FROM jsonb_array_elements(NEW.soil_analysis_snapshots) item
         UNION ALL SELECT (item->>'fieldId')::uuid FROM jsonb_array_elements(NEW.analysis_warnings) item
       ) covered WHERE NOT EXISTS (SELECT 1 FROM "farm"."operation_destinations" destination WHERE destination.operation_id=NEW.operation_id AND destination.field_id=covered.field_id)
     )
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.analysis_warnings) warning WHERE warning->>'code'<>'missing_valid_analysis')
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.soil_analysis_snapshots) snapshot WHERE jsonb_typeof(snapshot->'sampleFieldIds') IS DISTINCT FROM 'array' OR NOT ((snapshot->'sampleFieldIds') ? (snapshot->>'fieldId')))
  THEN RAISE EXCEPTION 'soil analysis snapshots and warnings must cover each destination field exactly once' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "operation_soil_analysis_coverage_guard" BEFORE INSERT OR UPDATE OF soil_analysis_snapshots,analysis_warnings ON "farm"."operation_soil_preparations" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_soil_analysis_coverage"();
CREATE FUNCTION "farm"."protect_frozen_soil_analysis"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.soil_analysis_snapshots IS DISTINCT FROM OLD.soil_analysis_snapshots OR NEW.analysis_warnings IS DISTINCT FROM OLD.analysis_warnings THEN
    RAISE EXCEPTION 'soil analysis selection is historically frozen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "operation_soil_analysis_immutable" BEFORE UPDATE ON "farm"."operation_soil_preparations" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_frozen_soil_analysis"();
--> statement-breakpoint
ALTER TABLE "farm"."operation_workers" ADD COLUMN "total_hours" numeric(10,4);
ALTER TABLE "farm"."operation_workers" ADD COLUMN "allocation_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "farm"."operation_equipment" ADD COLUMN "total_hours" numeric(10,4);
ALTER TABLE "farm"."operation_equipment" ADD COLUMN "allocation_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "farm"."operation_contractors" ADD COLUMN "total_hours" numeric(10,4);
ALTER TABLE "farm"."operation_contractors" ADD COLUMN "allocation_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
CREATE FUNCTION "farm"."validate_resource_allocation"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allocated numeric;
BEGIN
  IF NEW.total_hours IS NULL THEN
    IF jsonb_array_length(NEW.allocation_snapshot)<>0 THEN RAISE EXCEPTION 'allocation without total hours' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.total_hours<=0 OR jsonb_array_length(NEW.allocation_snapshot)=0 THEN RAISE EXCEPTION 'positive total hours and allocations are required' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum((item->>'hours')::numeric),0) INTO allocated FROM jsonb_array_elements(NEW.allocation_snapshot) item;
  IF abs(allocated-NEW.total_hours)>0.0001 THEN RAISE EXCEPTION 'destination hours must equal total hours' USING ERRCODE='23514'; END IF;
  IF jsonb_array_length(NEW.allocation_snapshot)<>(SELECT count(*) FROM "farm"."operation_destinations" destination WHERE destination.operation_id=NEW.operation_id)
     OR (SELECT count(DISTINCT concat(item->>'fieldId',':',coalesce(item->>'plantationId','field'))) FROM jsonb_array_elements(NEW.allocation_snapshot) item)<>jsonb_array_length(NEW.allocation_snapshot)
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(NEW.allocation_snapshot) item
       WHERE NOT EXISTS (
         SELECT 1 FROM "farm"."operation_destinations" destination
         WHERE destination.operation_id=NEW.operation_id
           AND destination.field_id=(item->>'fieldId')::uuid
           AND destination.plantation_id IS NOT DISTINCT FROM nullif(item->>'plantationId','')::uuid
       )
     ) THEN RAISE EXCEPTION 'resource allocations must cover each physical destination exactly once' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "operation_workers_allocation_guard" BEFORE INSERT OR UPDATE OF total_hours,allocation_snapshot ON "farm"."operation_workers" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_resource_allocation"();
CREATE TRIGGER "operation_equipment_allocation_guard" BEFORE INSERT OR UPDATE OF total_hours,allocation_snapshot ON "farm"."operation_equipment" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_resource_allocation"();
CREATE TRIGGER "operation_contractors_allocation_guard" BEFORE INSERT OR UPDATE OF total_hours,allocation_snapshot ON "farm"."operation_contractors" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_resource_allocation"();
