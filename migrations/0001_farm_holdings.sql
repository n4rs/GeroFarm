CREATE TABLE "farm"."farm_holdings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"name" varchar(160) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_holdings_code_format" CHECK ("farm"."farm_holdings"."code" ~ '^[A-Z0-9]{2,12}$'),
	CONSTRAINT "farm_holdings_status_valid" CHECK ("farm"."farm_holdings"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "farm"."farm_holdings" ADD CONSTRAINT "farm_holdings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "farm_holdings_organization_code_unique" ON "farm"."farm_holdings" USING btree ("organization_id", "code");
--> statement-breakpoint
CREATE INDEX "farm_holdings_organization_status_idx" ON "farm"."farm_holdings" USING btree ("organization_id", "status");
--> statement-breakpoint
ALTER TABLE "farm"."farm_holdings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."farm_holdings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "farm_holdings_tenant_isolation" ON "farm"."farm_holdings" AS RESTRICTIVE FOR ALL TO public USING ("farm"."farm_holdings"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("farm"."farm_holdings"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
CREATE TABLE "farm"."audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farm"."audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_events_organization_entity_idx" ON "farm"."audit_events" USING btree ("organization_id", "entity_type", "entity_id");
--> statement-breakpoint
ALTER TABLE "farm"."audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "audit_events_tenant_isolation" ON "farm"."audit_events" AS RESTRICTIVE FOR ALL TO public USING ("farm"."audit_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("farm"."audit_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
REVOKE UPDATE, DELETE ON TABLE "farm"."audit_events" FROM "gero_farm_app";
