CREATE TABLE "farm"."privacy_requests"("id" uuid PRIMARY KEY NOT NULL,"organization_id" uuid NOT NULL,"requester_user_id" uuid NOT NULL,"type" varchar(24) NOT NULL,"details" varchar(4000) NOT NULL,"status" varchar(20) DEFAULT 'submitted' NOT NULL,"response" varchar(4000),"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,"deadline_at" timestamp with time zone NOT NULL,"updated_at" timestamp with time zone DEFAULT now() NOT NULL,CONSTRAINT "privacy_requests_type_valid" CHECK("type" in ('access','rectification','erasure','restriction','portability','objection')),CONSTRAINT "privacy_requests_status_valid" CHECK("status" in ('submitted','in_review','completed','rejected','archived')));
--> statement-breakpoint
ALTER TABLE "farm"."privacy_requests" ADD CONSTRAINT "privacy_requests_org_fk" FOREIGN KEY("organization_id") REFERENCES "farm"."organizations"("organization_id");
--> statement-breakpoint
CREATE INDEX "privacy_requests_organization_status_idx" ON "farm"."privacy_requests"("organization_id","status","deadline_at");
--> statement-breakpoint
CREATE INDEX "privacy_requests_requester_idx" ON "farm"."privacy_requests"("organization_id","requester_user_id","submitted_at");
--> statement-breakpoint
ALTER TABLE "farm"."privacy_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "farm"."privacy_requests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "privacy_requests_tenant_isolation" ON "farm"."privacy_requests" AS RESTRICTIVE FOR ALL TO public USING("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
REVOKE DELETE ON TABLE "farm"."privacy_requests" FROM "gero_farm_app";
