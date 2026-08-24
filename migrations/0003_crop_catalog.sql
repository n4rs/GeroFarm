CREATE TABLE "farm"."crop_varieties" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"culture_id" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crop_varieties_culture_id_format" CHECK ("farm"."crop_varieties"."culture_id" ~ '^pt-drap-[0-9]{3}$')
);
--> statement-breakpoint
ALTER TABLE "farm"."crop_varieties" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."crop_varieties" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."crop_varieties" ADD CONSTRAINT "crop_varieties_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "farm"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "crop_varieties_organization_culture_name_unique" ON "farm"."crop_varieties" USING btree ("organization_id","culture_id","name");
--> statement-breakpoint
CREATE INDEX "crop_varieties_organization_culture_idx" ON "farm"."crop_varieties" USING btree ("organization_id","culture_id");
--> statement-breakpoint
CREATE POLICY "crop_varieties_tenant_isolation" ON "farm"."crop_varieties" AS RESTRICTIVE FOR ALL TO public USING ("crop_varieties"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid) WITH CHECK ("crop_varieties"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);
