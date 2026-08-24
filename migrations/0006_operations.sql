CREATE TABLE "farm"."operation_sequences"("organization_id" uuid NOT NULL,"year" numeric(4,0) NOT NULL,"next_value" numeric(12,0) DEFAULT 1 NOT NULL);
--> statement-breakpoint
ALTER TABLE "farm"."operation_sequences" ADD CONSTRAINT "operation_sequences_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "operation_sequences_organization_year_unique" ON "farm"."operation_sequences"("organization_id","year");
--> statement-breakpoint
ALTER TABLE "farm"."operation_sequences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operation_sequences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operation_sequences_tenant_isolation" ON "farm"."operation_sequences" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."operations"("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"code" varchar(24) NOT NULL,"field_id" uuid NOT NULL,"plantation_id" uuid,"type" varchar(32) NOT NULL,"performed_at" timestamp with time zone NOT NULL,"area_ha" numeric(12,4),"duration_minutes" numeric(8,0),"notes" varchar(2000),"status" varchar(16) DEFAULT 'performed' NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "operations_status_valid" CHECK("status" in ('performed','voided')));
--> statement-breakpoint
ALTER TABLE "farm"."operations" ADD CONSTRAINT "operations_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."operations" ADD CONSTRAINT "operations_field_fk" FOREIGN KEY("field_id") REFERENCES "farm"."fields"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operations" ADD CONSTRAINT "operations_plantation_fk" FOREIGN KEY("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "operations_organization_code_unique" ON "farm"."operations"("organization_id","code");
--> statement-breakpoint
CREATE INDEX "operations_field_date_idx" ON "farm"."operations"("organization_id","field_id","performed_at");
--> statement-breakpoint
ALTER TABLE "farm"."operations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."operations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "operations_tenant_isolation" ON "farm"."operations" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."operation_workers"("operation_id" uuid NOT NULL,"worker_id" uuid NOT NULL,"organization_id" uuid NOT NULL);
--> statement-breakpoint
ALTER TABLE "farm"."operation_workers" ADD CONSTRAINT "operation_workers_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_workers" ADD CONSTRAINT "operation_workers_worker_fk" FOREIGN KEY("worker_id") REFERENCES "farm"."workers"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_workers" ADD CONSTRAINT "operation_workers_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "operation_workers_unique" ON "farm"."operation_workers"("operation_id","worker_id");
--> statement-breakpoint
CREATE TABLE "farm"."operation_equipment"("operation_id" uuid NOT NULL,"equipment_id" uuid NOT NULL,"organization_id" uuid NOT NULL);
--> statement-breakpoint
ALTER TABLE "farm"."operation_equipment" ADD CONSTRAINT "operation_equipment_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_equipment" ADD CONSTRAINT "operation_equipment_equipment_fk" FOREIGN KEY("equipment_id") REFERENCES "farm"."equipment"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_equipment" ADD CONSTRAINT "operation_equipment_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "operation_equipment_unique" ON "farm"."operation_equipment"("operation_id","equipment_id");
--> statement-breakpoint
CREATE TABLE "farm"."operation_contractors"("operation_id" uuid NOT NULL,"contractor_id" uuid NOT NULL,"organization_id" uuid NOT NULL);
--> statement-breakpoint
ALTER TABLE "farm"."operation_contractors" ADD CONSTRAINT "operation_contractors_operation_fk" FOREIGN KEY("operation_id") REFERENCES "farm"."operations"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_contractors" ADD CONSTRAINT "operation_contractors_contractor_fk" FOREIGN KEY("contractor_id") REFERENCES "farm"."contractors"("id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_contractors" ADD CONSTRAINT "operation_contractors_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "operation_contractors_unique" ON "farm"."operation_contractors"("operation_id","contractor_id");
--> statement-breakpoint
ALTER TABLE "farm"."operation_workers" ENABLE ROW LEVEL SECURITY; ALTER TABLE "farm"."operation_workers" FORCE ROW LEVEL SECURITY; CREATE POLICY "operation_workers_tenant_isolation" ON "farm"."operation_workers" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
ALTER TABLE "farm"."operation_equipment" ENABLE ROW LEVEL SECURITY; ALTER TABLE "farm"."operation_equipment" FORCE ROW LEVEL SECURITY; CREATE POLICY "operation_equipment_tenant_isolation" ON "farm"."operation_equipment" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
ALTER TABLE "farm"."operation_contractors" ENABLE ROW LEVEL SECURITY; ALTER TABLE "farm"."operation_contractors" FORCE ROW LEVEL SECURITY; CREATE POLICY "operation_contractors_tenant_isolation" ON "farm"."operation_contractors" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."operations" FROM "gero_farm_app";
