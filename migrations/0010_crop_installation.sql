CREATE TABLE "farm"."operation_crop_installations"("operation_id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"plantation_id" uuid NOT NULL,"culture_id" varchar(32) NOT NULL,"variety_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,"variety_densities" jsonb DEFAULT '[]'::jsonb NOT NULL,"method" varchar(24) NOT NULL,"custom_method" varchar(120),"ended_on" date,"density_plants_ha" numeric(14,2) NOT NULL,"row_spacing_cm" numeric(10,2),"plant_spacing_cm" numeric(10,2),"material_lots" jsonb DEFAULT '[]'::jsonb NOT NULL,"predecessor" varchar(160),"preparatory_operation_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,CONSTRAINT "operation_crop_installations_method_valid" CHECK("method" in ('sowing','transplanting','planting','other')),CONSTRAINT "operation_crop_installations_custom_method_valid" CHECK(("method"='other' and "custom_method" is not null) or ("method"<>'other' and "custom_method" is null)),CONSTRAINT "operation_crop_installations_density_valid" CHECK("density_plants_ha" > 0));
--> statement-breakpoint
ALTER TABLE "farm"."operation_crop_installations" ADD CONSTRAINT "operation_crop_installations_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_crop_installations" ADD CONSTRAINT "operation_crop_installations_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_crop_installations" ADD CONSTRAINT "operation_crop_installations_plantation_fk" FOREIGN KEY("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_crop_installations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_crop_installations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_crop_installations_tenant_isolation" ON "farm"."operation_crop_installations" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_crop_installations" FROM "gero_farm_app";
