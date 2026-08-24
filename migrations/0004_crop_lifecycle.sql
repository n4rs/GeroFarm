CREATE TABLE "farm"."plantations" (
  "id" uuid PRIMARY KEY NOT NULL, "organization_id" uuid NOT NULL, "field_id" uuid NOT NULL, "culture_id" varchar(32) NOT NULL, "variety_id" uuid, "name" varchar(160) NOT NULL, "kind" varchar(16) NOT NULL, "area_ha" numeric(12,4) NOT NULL, "started_on" date NOT NULL, "ended_on" date, "status" varchar(16) DEFAULT 'active' NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plantations_kind_valid" CHECK ("kind" in ('permanent','temporary')), CONSTRAINT "plantations_status_valid" CHECK ("status" in ('active','ended','uprooted')), CONSTRAINT "plantations_area_valid" CHECK ("area_ha" > 0), CONSTRAINT "plantations_dates_valid" CHECK ("ended_on" is null or "ended_on" >= "started_on")
);
--> statement-breakpoint
ALTER TABLE "farm"."plantations" ADD CONSTRAINT "plantations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."plantations" ADD CONSTRAINT "plantations_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "farm"."fields"("id");
--> statement-breakpoint
ALTER TABLE "farm"."plantations" ADD CONSTRAINT "plantations_variety_id_fk" FOREIGN KEY ("variety_id") REFERENCES "farm"."crop_varieties"("id");
--> statement-breakpoint
CREATE INDEX "plantations_field_status_idx" ON "farm"."plantations" ("organization_id","field_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."plantations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."plantations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "plantations_tenant_isolation" ON "farm"."plantations" AS RESTRICTIVE FOR ALL TO public USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."crop_periods" (
  "id" uuid PRIMARY KEY NOT NULL, "organization_id" uuid NOT NULL, "plantation_id" uuid NOT NULL, "kind" varchar(16) NOT NULL, "name" varchar(160) NOT NULL, "started_on" date NOT NULL, "ended_on" date, "status" varchar(16) DEFAULT 'active' NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "crop_periods_kind_valid" CHECK ("kind" in ('campaign','cycle')), CONSTRAINT "crop_periods_status_valid" CHECK ("status" in ('active','closed')), CONSTRAINT "crop_periods_dates_valid" CHECK ("ended_on" is null or "ended_on" >= "started_on")
);
--> statement-breakpoint
ALTER TABLE "farm"."crop_periods" ADD CONSTRAINT "crop_periods_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."crop_periods" ADD CONSTRAINT "crop_periods_plantation_id_fk" FOREIGN KEY ("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
CREATE INDEX "crop_periods_plantation_status_idx" ON "farm"."crop_periods" ("organization_id","plantation_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."crop_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."crop_periods" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crop_periods_tenant_isolation" ON "farm"."crop_periods" AS RESTRICTIVE FOR ALL TO public USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."plantation_uprootings" ("id" uuid PRIMARY KEY NOT NULL, "organization_id" uuid NOT NULL, "plantation_id" uuid NOT NULL, "uprooted_on" date NOT NULL, "reason" varchar(500) NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "farm"."plantation_uprootings" ADD CONSTRAINT "plantation_uprootings_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."plantation_uprootings" ADD CONSTRAINT "plantation_uprootings_plantation_id_fk" FOREIGN KEY ("plantation_id") REFERENCES "farm"."plantations"("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "plantation_uprootings_plantation_unique" ON "farm"."plantation_uprootings" ("plantation_id");
--> statement-breakpoint
ALTER TABLE "farm"."plantation_uprootings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."plantation_uprootings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "plantation_uprootings_tenant_isolation" ON "farm"."plantation_uprootings" AS RESTRICTIVE FOR ALL TO public USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."field_fallows" ("id" uuid PRIMARY KEY NOT NULL, "organization_id" uuid NOT NULL, "field_id" uuid NOT NULL, "name" varchar(160) NOT NULL, "area_ha" numeric(12,4) NOT NULL, "started_on" date NOT NULL, "ended_on" date, "status" varchar(16) DEFAULT 'active' NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL, CONSTRAINT "field_fallows_area_valid" CHECK ("area_ha" > 0), CONSTRAINT "field_fallows_status_valid" CHECK ("status" in ('active','closed')), CONSTRAINT "field_fallows_dates_valid" CHECK ("ended_on" is null or "ended_on" >= "started_on"));
--> statement-breakpoint
ALTER TABLE "farm"."field_fallows" ADD CONSTRAINT "field_fallows_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
ALTER TABLE "farm"."field_fallows" ADD CONSTRAINT "field_fallows_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "farm"."fields"("id");
--> statement-breakpoint
CREATE INDEX "field_fallows_field_status_idx" ON "farm"."field_fallows" ("organization_id","field_id","status");
--> statement-breakpoint
ALTER TABLE "farm"."field_fallows" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."field_fallows" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "field_fallows_tenant_isolation" ON "farm"."field_fallows" AS RESTRICTIVE FOR ALL TO public USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
