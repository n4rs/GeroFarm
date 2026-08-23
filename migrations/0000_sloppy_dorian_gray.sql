CREATE SCHEMA "farm";
--> statement-breakpoint
CREATE TABLE "farm"."organizations" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"default_locale" varchar(16) DEFAULT 'pt-PT' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Europe/Lisbon' NOT NULL,
	"core_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farm"."organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "farm"."organizations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "organizations_tenant_isolation" ON "farm"."organizations" AS RESTRICTIVE FOR ALL TO public USING ("farm"."organizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("farm"."organizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
--> statement-breakpoint
REVOKE ALL ON SCHEMA "farm" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "farm" TO "gero_farm_app";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "farm" TO "gero_farm_app";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE "gero_farm_migrator" IN SCHEMA "farm" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "gero_farm_app";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE "gero_farm_migrator" IN SCHEMA "farm" GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO "gero_farm_app";
