CREATE TABLE "farm"."operation_fertilizations"("operation_id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"mode" varchar(40) NOT NULL,"custom_mode" varchar(120),"products" jsonb NOT NULL,CONSTRAINT "operation_fertilizations_products_valid" CHECK(jsonb_array_length("products") > 0));
--> statement-breakpoint
ALTER TABLE "farm"."operation_fertilizations" ADD CONSTRAINT "operation_fertilizations_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_fertilizations" ADD CONSTRAINT "operation_fertilizations_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_fertilizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_fertilizations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_fertilizations_tenant_isolation" ON "farm"."operation_fertilizations" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_fertilizations" FROM "gero_farm_app";
