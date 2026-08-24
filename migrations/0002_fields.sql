CREATE TABLE "farm"."fields" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"holding_id" uuid NOT NULL,
	"code" varchar(4) NOT NULL,
	"name" varchar(160) NOT NULL,
	"geometry" jsonb NOT NULL,
	"total_area_ha" numeric(12, 4) NOT NULL,
	"usable_area_ha" numeric(12, 4) NOT NULL,
	"manually_closed" boolean DEFAULT false NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"code_locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fields_code_format" CHECK ("farm"."fields"."code" ~ '^[A-Z0-9]{4}$' and "farm"."fields"."code" <> '0MIX'),
	CONSTRAINT "fields_area_valid" CHECK ("farm"."fields"."total_area_ha" > 0 and "farm"."fields"."usable_area_ha" > 0 and "farm"."fields"."usable_area_ha" <= "farm"."fields"."total_area_ha"),
	CONSTRAINT "fields_status_valid" CHECK ("farm"."fields"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "farm"."fields" ADD CONSTRAINT "fields_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "farm"."fields" ADD CONSTRAINT "fields_holding_id_farm_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "farm"."farm_holdings"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "fields_organization_code_unique" ON "farm"."fields" USING btree ("organization_id", "code");
--> statement-breakpoint
CREATE INDEX "fields_holding_status_idx" ON "farm"."fields" USING btree ("organization_id", "holding_id", "status");
--> statement-breakpoint
ALTER TABLE "farm"."fields" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."fields" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fields_tenant_isolation" ON "farm"."fields" AS RESTRICTIVE FOR ALL TO public USING ("farm"."fields"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("farm"."fields"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
