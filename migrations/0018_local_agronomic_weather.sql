CREATE TABLE "farm"."weather_syncs" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "plantation_id" uuid NOT NULL REFERENCES "farm"."plantations"("id"),
  "campaign_id" uuid REFERENCES "farm"."crop_periods"("id"),
  "from_date" date NOT NULL,
  "to_date" date NOT NULL,
  "status" varchar(24) NOT NULL,
  "coverage" jsonb NOT NULL,
  "station_periods" jsonb NOT NULL,
  "fetched_at" timestamptz,
  "cached" boolean NOT NULL,
  "stale" boolean NOT NULL,
  "cache_status" varchar(24) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "weather_syncs_dates_valid" CHECK ("to_date" >= "from_date"),
  CONSTRAINT "weather_syncs_status_valid" CHECK ("status" IN ('complete','partial','unavailable'))
);
--> statement-breakpoint
CREATE INDEX "weather_syncs_org_plantation_interval_idx" ON "farm"."weather_syncs"("organization_id","plantation_id","from_date","to_date");
--> statement-breakpoint
ALTER TABLE "farm"."weather_syncs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "weather_syncs_tenant_isolation" ON "farm"."weather_syncs" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."weather_samples" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "plantation_id" uuid NOT NULL REFERENCES "farm"."plantations"("id"),
  "campaign_id" uuid REFERENCES "farm"."crop_periods"("id"),
  "station_id" uuid NOT NULL,
  "assignment_id" uuid NOT NULL,
  "resolution" varchar(8) NOT NULL,
  "sample_at" timestamptz NOT NULL,
  "local_date" date NOT NULL,
  "timezone" varchar(100),
  "station" jsonb NOT NULL,
  "payload" jsonb NOT NULL,
  "temporal_status" varchar(16) NOT NULL,
  "value_source" varchar(16) NOT NULL,
  "fetched_at" timestamptz,
  "cached" boolean NOT NULL,
  "stale" boolean NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "weather_samples_resolution_valid" CHECK ("resolution" IN ('hourly','daily')),
  CONSTRAINT "weather_samples_temporal_valid" CHECK ("temporal_status" IN ('observed','forecast')),
  CONSTRAINT "weather_samples_source_valid" CHECK ("value_source" IN ('measured','estimated'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "weather_samples_idempotent_unique" ON "farm"."weather_samples"("organization_id","plantation_id","station_id","resolution","sample_at");
--> statement-breakpoint
CREATE INDEX "weather_samples_org_plantation_date_idx" ON "farm"."weather_samples"("organization_id","plantation_id","local_date","resolution");
--> statement-breakpoint
ALTER TABLE "farm"."weather_samples" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "weather_samples_tenant_isolation" ON "farm"."weather_samples" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."weather_agronomic_profiles" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "plantation_id" uuid NOT NULL REFERENCES "farm"."plantations"("id"),
  "campaign_id" uuid NOT NULL REFERENCES "farm"."crop_periods"("id"),
  "crop_id" varchar(150) NOT NULL,
  "variety_id" varchar(150) NOT NULL,
  "method_version" varchar(50) NOT NULL,
  "parameters" jsonb NOT NULL,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "weather_profiles_dates_valid" CHECK ("valid_to" IS NULL OR "valid_to">="valid_from")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "weather_profiles_campaign_from_unique" ON "farm"."weather_agronomic_profiles"("organization_id","campaign_id","valid_from");
--> statement-breakpoint
ALTER TABLE "farm"."weather_agronomic_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "weather_profiles_tenant_isolation" ON "farm"."weather_agronomic_profiles" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."weather_agronomic_results" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "plantation_id" uuid NOT NULL REFERENCES "farm"."plantations"("id"),
  "campaign_id" uuid REFERENCES "farm"."crop_periods"("id"),
  "from_date" date NOT NULL,
  "to_date" date NOT NULL,
  "engine_version" varchar(50) NOT NULL,
  "input_hash" varchar(64) NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "weather_results_dates_valid" CHECK ("to_date">="from_date")
);
--> statement-breakpoint
ALTER TABLE "farm"."weather_agronomic_results" ADD CONSTRAINT "weather_results_reproducible_unique" UNIQUE NULLS NOT DISTINCT ("organization_id","plantation_id","campaign_id","from_date","to_date","engine_version","input_hash");
--> statement-breakpoint
ALTER TABLE "farm"."weather_agronomic_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "weather_results_tenant_isolation" ON "farm"."weather_agronomic_results" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
