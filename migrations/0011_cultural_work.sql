CREATE TABLE "farm"."operation_cultural_works"("operation_id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"actions" jsonb NOT NULL,"method" varchar(24) NOT NULL,"custom_method" varchar(120),"intensity" varchar(16),"intensity_percentage" numeric(7,2),"biomass_destination" varchar(24),"plant_percentage" numeric(7,2),"plant_count" numeric(12,0),"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,"replanting" jsonb,CONSTRAINT "operation_cultural_works_actions_valid" CHECK(jsonb_array_length("actions") > 0),CONSTRAINT "operation_cultural_works_method_valid" CHECK("method" in ('manual','mechanical','thermal','other')),CONSTRAINT "operation_cultural_works_intensity_valid" CHECK("intensity" is null or "intensity" in ('light','medium','severe')),CONSTRAINT "operation_cultural_works_biomass_valid" CHECK("biomass_destination" is null or "biomass_destination" in ('left','shredded','incorporated','removed','burned','other')));
--> statement-breakpoint
ALTER TABLE "farm"."operation_cultural_works" ADD CONSTRAINT "operation_cultural_works_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_cultural_works" ADD CONSTRAINT "operation_cultural_works_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_cultural_works" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_cultural_works" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_cultural_works_tenant_isolation" ON "farm"."operation_cultural_works" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_cultural_works" FROM "gero_farm_app";
