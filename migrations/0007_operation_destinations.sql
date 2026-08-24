CREATE TABLE "farm"."operation_destinations"("id" uuid PRIMARY KEY NOT NULL,"operation_id" uuid NOT NULL,"organization_id" uuid NOT NULL,"field_id" uuid NOT NULL,"plantation_id" uuid,"area_ha" numeric(12,4) NOT NULL,"percentage" numeric(7,4) NOT NULL,CONSTRAINT "operation_destinations_area_valid" CHECK("area_ha" > 0),CONSTRAINT "operation_destinations_percentage_valid" CHECK("percentage" > 0 and "percentage" <= 100));
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" ADD CONSTRAINT "operation_destinations_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" ADD CONSTRAINT "operation_destinations_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" ADD CONSTRAINT "operation_destinations_field_fk" FOREIGN KEY("field_id") REFERENCES "farm"."fields"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" ADD CONSTRAINT "operation_destinations_plantation_fk" FOREIGN KEY("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
CREATE INDEX "operation_destinations_operation_idx" ON "farm"."operation_destinations"("organization_id","operation_id");
--> statement-breakpoint
INSERT INTO "farm"."operation_destinations"("id","operation_id","organization_id","field_id","plantation_id","area_ha","percentage") SELECT gen_random_uuid(),operation.id,operation.organization_id,operation.field_id,operation.plantation_id,coalesce(operation.area_ha,field.usable_area_ha),100 FROM "farm"."operations" operation INNER JOIN "farm"."fields" field ON field.id=operation.field_id;
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_destinations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_destinations_tenant_isolation" ON "farm"."operation_destinations" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
DROP INDEX "farm"."operations_field_date_idx";
--> statement-breakpoint
ALTER TABLE "farm"."operations" DROP CONSTRAINT "operations_field_fk";
--> statement-breakpoint
ALTER TABLE "farm"."operations" DROP CONSTRAINT "operations_plantation_fk";
--> statement-breakpoint
ALTER TABLE "farm"."operations" DROP COLUMN "field_id";
--> statement-breakpoint
ALTER TABLE "farm"."operations" DROP COLUMN "plantation_id";
--> statement-breakpoint
ALTER TABLE "farm"."operations" DROP COLUMN "area_ha";
--> statement-breakpoint
CREATE INDEX "operations_organization_date_idx" ON "farm"."operations"("organization_id","performed_at");
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operation_destinations" FROM "gero_farm_app";
