CREATE TABLE "farm"."fertilization_plans"("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"name" varchar(180) NOT NULL,"culture_id" varchar(32) NOT NULL,"starts_on" date NOT NULL,"ends_on" date NOT NULL,"version" numeric(6,0) NOT NULL,"status" varchar(16) DEFAULT 'draft' NOT NULL,"notes" varchar(2000),"activated_at" timestamp with time zone,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "fertilization_plans_dates_valid" CHECK("ends_on" >= "starts_on"),CONSTRAINT "fertilization_plans_version_valid" CHECK("version" > 0),CONSTRAINT "fertilization_plans_status_valid" CHECK("status" in ('draft','in_force','superseded')));
--> statement-breakpoint
ALTER TABLE "farm"."fertilization_plans" ADD CONSTRAINT "fertilization_plans_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fertilization_plans_org_culture_version_unique" ON "farm"."fertilization_plans"("organization_id","culture_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "fertilization_plans_one_in_force" ON "farm"."fertilization_plans"("organization_id","culture_id") WHERE "status" = 'in_force';
--> statement-breakpoint
CREATE INDEX "fertilization_plans_org_status_idx" ON "farm"."fertilization_plans"("organization_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."fertilization_plans" ENABLE ROW LEVEL SECURITY; ALTER TABLE "farm"."fertilization_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fertilization_plans_tenant_isolation" ON "farm"."fertilization_plans" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."fertilization_plan_fields"("id" uuid PRIMARY KEY NOT NULL,"plan_id" uuid NOT NULL,"organization_id" uuid NOT NULL,"field_id" uuid NOT NULL,"plantation_id" uuid,"target_type" varchar(24) NOT NULL,"target_label" varchar(180) NOT NULL,"area_ha" numeric(12,4) NOT NULL,"objectives_kg_ha" jsonb NOT NULL,"planned_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,"irrigation_sector_snapshot" varchar(180),"nitrate_analysis_snapshot" jsonb,"irrigation_forecast_m3_ha" numeric(14,3),"include_cover_crop" boolean DEFAULT false NOT NULL,"cover_crop_contribution_kg_ha" jsonb,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "fertilization_plan_fields_target_valid" CHECK("target_type" in ('current_plantation','next_planting','current_campaign','next_campaign')),CONSTRAINT "fertilization_plan_fields_area_valid" CHECK("area_ha" > 0),CONSTRAINT "fertilization_plan_fields_irrigation_valid" CHECK("irrigation_forecast_m3_ha" is null or "irrigation_forecast_m3_ha" >= 0));
--> statement-breakpoint
ALTER TABLE "farm"."fertilization_plan_fields" ADD CONSTRAINT "fertilization_plan_fields_plan_fk" FOREIGN KEY("plan_id") REFERENCES "farm"."fertilization_plans"("id"); ALTER TABLE "farm"."fertilization_plan_fields" ADD CONSTRAINT "fertilization_plan_fields_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id"); ALTER TABLE "farm"."fertilization_plan_fields" ADD CONSTRAINT "fertilization_plan_fields_field_fk" FOREIGN KEY("field_id") REFERENCES "farm"."fields"("id"); ALTER TABLE "farm"."fertilization_plan_fields" ADD CONSTRAINT "fertilization_plan_fields_plantation_fk" FOREIGN KEY("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fertilization_plan_fields_plan_field_unique" ON "farm"."fertilization_plan_fields"("plan_id","field_id"); CREATE INDEX "fertilization_plan_fields_org_plan_idx" ON "farm"."fertilization_plan_fields"("organization_id","plan_id");
--> statement-breakpoint
ALTER TABLE "farm"."fertilization_plan_fields" ENABLE ROW LEVEL SECURITY; ALTER TABLE "farm"."fertilization_plan_fields" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fertilization_plan_fields_tenant_isolation" ON "farm"."fertilization_plan_fields" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE FUNCTION "farm"."protect_fertilization_plan_history"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.status <> 'draft' THEN IF NEW.status = 'superseded' AND OLD.status = 'in_force' AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN RETURN NEW; END IF; RAISE EXCEPTION 'fertilization plan history is immutable'; END IF; RETURN NEW; END $$;
--> statement-breakpoint
CREATE TRIGGER "fertilization_plans_immutable_history" BEFORE UPDATE ON "farm"."fertilization_plans" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_fertilization_plan_history"();
--> statement-breakpoint
CREATE FUNCTION "farm"."protect_fertilization_plan_field_history"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM "farm"."fertilization_plans" WHERE "id" = OLD."plan_id" AND "status" <> 'draft') THEN RAISE EXCEPTION 'fertilization plan field history is immutable'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
--> statement-breakpoint
CREATE TRIGGER "fertilization_plan_fields_immutable_history" BEFORE UPDATE OR DELETE ON "farm"."fertilization_plan_fields" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_fertilization_plan_field_history"();
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."fertilization_plans", "farm"."fertilization_plan_fields" FROM "gero_farm_app";
