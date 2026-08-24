CREATE TABLE "farm"."workers" ("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"name" varchar(160) NOT NULL,"role" varchar(120) NOT NULL,"email" varchar(200),"phone" varchar(40),"status" varchar(16) DEFAULT 'active' NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "workers_status_valid" CHECK ("status" in ('active','inactive')));
--> statement-breakpoint
ALTER TABLE "farm"."workers" ADD CONSTRAINT "workers_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE INDEX "workers_organization_status_idx" ON "farm"."workers" ("organization_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."workers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."workers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workers_tenant_isolation" ON "farm"."workers" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."worker_certificates" ("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"worker_id" uuid NOT NULL,"type" varchar(48) NOT NULL,"number" varchar(80) NOT NULL,"valid_from" date NOT NULL,"valid_until" date NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "worker_certificates_type_valid" CHECK ("type" in ('phytopharmaceutical_applicator','machinery_operator','other')),CONSTRAINT "worker_certificates_dates_valid" CHECK ("valid_until">="valid_from"));
--> statement-breakpoint
ALTER TABLE "farm"."worker_certificates" ADD CONSTRAINT "worker_certificates_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."worker_certificates" ADD CONSTRAINT "worker_certificates_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "farm"."workers"("id");
--> statement-breakpoint
CREATE INDEX "worker_certificates_worker_validity_idx" ON "farm"."worker_certificates" ("organization_id","worker_id","valid_until");
--> statement-breakpoint
ALTER TABLE "farm"."worker_certificates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."worker_certificates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "worker_certificates_tenant_isolation" ON "farm"."worker_certificates" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."contractors" ("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"name" varchar(180) NOT NULL,"tax_identifier" varchar(40),"contact_name" varchar(160),"email" varchar(200),"phone" varchar(40),"status" varchar(16) DEFAULT 'active' NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "contractors_status_valid" CHECK ("status" in ('active','inactive')));
--> statement-breakpoint
ALTER TABLE "farm"."contractors" ADD CONSTRAINT "contractors_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE INDEX "contractors_organization_status_idx" ON "farm"."contractors" ("organization_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."contractors" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."contractors" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "contractors_tenant_isolation" ON "farm"."contractors" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."equipment" ("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"code" varchar(20) NOT NULL,"name" varchar(160) NOT NULL,"category" varchar(24) NOT NULL,"status" varchar(16) DEFAULT 'active' NOT NULL,"created_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "equipment_category_valid" CHECK ("category" in ('tractor','implement','sprayer','irrigation','vehicle','other')),CONSTRAINT "equipment_status_valid" CHECK ("status" in ('active','maintenance','inactive')));
--> statement-breakpoint
ALTER TABLE "farm"."equipment" ADD CONSTRAINT "equipment_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_organization_code_unique" ON "farm"."equipment" ("organization_id","code");
--> statement-breakpoint
CREATE INDEX "equipment_organization_status_idx" ON "farm"."equipment" ("organization_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."equipment" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."equipment" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "equipment_tenant_isolation" ON "farm"."equipment" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
