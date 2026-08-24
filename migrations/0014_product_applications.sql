CREATE TABLE "farm"."operation_sprayings"(
  "operation_id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL,
  "method" varchar(32) NOT NULL,
  "custom_method" varchar(120),
  "spray_volume_l_ha" numeric(14,4),
  "legal_applicator_worker_id" uuid,
  "products" jsonb NOT NULL,
  "weather" jsonb NOT NULL,
  "equipment_inspection_valid" boolean,
  "equipment_calibration_valid" boolean,
  "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "warnings_accepted" boolean DEFAULT false NOT NULL,
  CONSTRAINT "operation_sprayings_products_valid" CHECK(jsonb_array_length("products") > 0),
  CONSTRAINT "operation_sprayings_method_valid" CHECK("method" in ('spray','granules','bait','injection','other')),
  CONSTRAINT "operation_sprayings_volume_valid" CHECK(("method" = 'spray' and "spray_volume_l_ha" > 0) or ("method" <> 'spray' and "spray_volume_l_ha" is null))
);
--> statement-breakpoint
ALTER TABLE "farm"."operation_sprayings" ADD CONSTRAINT "operation_sprayings_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_sprayings" ADD CONSTRAINT "operation_sprayings_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_sprayings" ADD CONSTRAINT "operation_sprayings_legal_applicator_fk" FOREIGN KEY("legal_applicator_worker_id") REFERENCES "farm"."workers"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_sprayings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_sprayings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_sprayings_tenant_isolation" ON "farm"."operation_sprayings" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_sprayings" FROM "gero_farm_app";
