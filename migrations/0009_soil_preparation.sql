CREATE TABLE "farm"."operation_soil_preparations"("operation_id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"actions" jsonb NOT NULL,"depth_cm" numeric(7,2),"passes" numeric(4,0),"soil_condition" varchar(16),"residue_destination" varchar(24),CONSTRAINT "operation_soil_preparations_actions_valid" CHECK(jsonb_array_length("actions") > 0),CONSTRAINT "operation_soil_preparations_depth_valid" CHECK("depth_cm" is null or "depth_cm" > 0),CONSTRAINT "operation_soil_preparations_passes_valid" CHECK("passes" is null or "passes" > 0),CONSTRAINT "operation_soil_preparations_condition_valid" CHECK("soil_condition" is null or "soil_condition" in ('dry','moist','wet')),CONSTRAINT "operation_soil_preparations_residue_valid" CHECK("residue_destination" is null or "residue_destination" in ('left','shredded','incorporated','removed','burned','other')));
--> statement-breakpoint
ALTER TABLE "farm"."operation_soil_preparations" ADD CONSTRAINT "operation_soil_preparations_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_soil_preparations" ADD CONSTRAINT "operation_soil_preparations_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_soil_preparations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_soil_preparations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_soil_preparations_tenant_isolation" ON "farm"."operation_soil_preparations" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_soil_preparations" FROM "gero_farm_app";
