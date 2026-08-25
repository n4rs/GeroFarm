ALTER TABLE "farm"."inventory_products" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."inventory_lots" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."operation_consumptions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."inventory_movements" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."farm_costs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."weather_syncs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."weather_samples" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."weather_agronomic_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "farm"."weather_agronomic_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE DELETE ON "farm"."inventory_products", "farm"."inventory_lots", "farm"."operation_consumptions", "farm"."inventory_movements", "farm"."farm_costs" FROM "gero_farm_app";
--> statement-breakpoint
DO $$
DECLARE table_row record;
BEGIN
  FOR table_row IN SELECT tablename FROM pg_tables WHERE schemaname = 'farm'
  LOOP
    EXECUTE format('ALTER TABLE farm.%I NO FORCE ROW LEVEL SECURITY', table_row.tablename);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "farm"."crop_periods" WHERE "status"='active' GROUP BY "organization_id","plantation_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enforce one active cultural period while duplicates exist';
  END IF;
  IF EXISTS (SELECT 1 FROM "farm"."weather_agronomic_profiles" WHERE "valid_to" IS NULL GROUP BY "organization_id","campaign_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enforce one open weather profile while overlaps exist';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "crop_periods_one_active_per_plantation" ON "farm"."crop_periods" ("organization_id","plantation_id") WHERE "status"='active';
CREATE UNIQUE INDEX "weather_profiles_one_open_per_campaign" ON "farm"."weather_agronomic_profiles" ("organization_id","campaign_id") WHERE "valid_to" IS NULL;
--> statement-breakpoint
ALTER TABLE "farm"."irrigation_records" ADD CONSTRAINT "irrigation_records_state_consistent" CHECK (
  ("status"='scheduled' AND "operation_id" IS NULL AND "performed_at" IS NULL AND "scheduled_week_end" IS NOT NULL)
  OR
  ("status" IN ('performed','performed_by_schedule','reversed') AND "operation_id" IS NOT NULL AND "performed_at" IS NOT NULL)
) NOT VALID;
ALTER TABLE "farm"."irrigation_records" VALIDATE CONSTRAINT "irrigation_records_state_consistent";
--> statement-breakpoint
CREATE UNIQUE INDEX "workers_org_id_unique" ON "farm"."workers" ("organization_id","id");
CREATE UNIQUE INDEX "equipment_org_id_unique" ON "farm"."equipment" ("organization_id","id");
CREATE UNIQUE INDEX "contractors_org_id_unique" ON "farm"."contractors" ("organization_id","id");
ALTER TABLE "farm"."operation_workers" ADD CONSTRAINT "operation_workers_same_tenant_fk" FOREIGN KEY ("organization_id","worker_id") REFERENCES "farm"."workers" ("organization_id","id");
ALTER TABLE "farm"."operation_equipment" ADD CONSTRAINT "operation_equipment_same_tenant_fk" FOREIGN KEY ("organization_id","equipment_id") REFERENCES "farm"."equipment" ("organization_id","id");
ALTER TABLE "farm"."operation_contractors" ADD CONSTRAINT "operation_contractors_same_tenant_fk" FOREIGN KEY ("organization_id","contractor_id") REFERENCES "farm"."contractors" ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "farm"."idempotency_requests" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "key" varchar(128) NOT NULL,
  "method" varchar(8) NOT NULL,
  "path" varchar(300) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "status" varchar(16) NOT NULL,
  "response_status" numeric(3,0),
  "response_headers" jsonb,
  "response_body" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "idempotency_requests_status_valid" CHECK ("status" IN ('pending','completed'))
);
CREATE UNIQUE INDEX "idempotency_requests_org_key_unique" ON "farm"."idempotency_requests" ("organization_id","key");
CREATE INDEX "idempotency_requests_expiry_idx" ON "farm"."idempotency_requests" ("expires_at");
ALTER TABLE "farm"."idempotency_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."idempotency_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "idempotency_requests_tenant_isolation" ON "farm"."idempotency_requests" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON "farm"."idempotency_requests" TO "gero_farm_app";
--> statement-breakpoint
CREATE FUNCTION "farm"."enforce_same_tenant_reference"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  reference_value text;
  reference_exists boolean;
BEGIN
  reference_value := to_jsonb(NEW) ->> TG_ARGV[2];
  IF reference_value IS NULL THEN RETURN NEW; END IF;
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE organization_id = $1 AND %I = $2::uuid)',
    TG_ARGV[0], TG_ARGV[1], TG_ARGV[3]
  ) INTO reference_exists USING NEW.organization_id, reference_value;
  IF NOT reference_exists THEN
    RAISE EXCEPTION 'Cross-tenant or missing reference %.% -> %.%', TG_TABLE_NAME, TG_ARGV[2], TG_ARGV[1], TG_ARGV[3] USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  relation record;
  invalid_reference boolean;
  trigger_name text;
BEGIN
  FOR relation IN
    SELECT child_ns.nspname AS child_schema, child.relname AS child_table, child_column.attname AS child_column,
           parent_ns.nspname AS parent_schema, parent.relname AS parent_table, parent_column.attname AS parent_column,
           constraint_row.conname AS constraint_name
    FROM pg_constraint constraint_row
    JOIN pg_class child ON child.oid = constraint_row.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = constraint_row.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN pg_attribute child_column ON child_column.attrelid = child.oid AND child_column.attnum = constraint_row.conkey[1]
    JOIN pg_attribute parent_column ON parent_column.attrelid = parent.oid AND parent_column.attnum = constraint_row.confkey[1]
    WHERE constraint_row.contype = 'f' AND array_length(constraint_row.conkey, 1) = 1
      AND child_ns.nspname = 'farm' AND parent_ns.nspname = 'farm'
      AND child_column.attname <> 'organization_id'
      AND EXISTS (SELECT 1 FROM pg_attribute attribute WHERE attribute.attrelid = child.oid AND attribute.attname = 'organization_id' AND NOT attribute.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute attribute WHERE attribute.attrelid = parent.oid AND attribute.attname = 'organization_id' AND NOT attribute.attisdropped)
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I child LEFT JOIN %I.%I parent ON parent.%I = child.%I AND parent.organization_id = child.organization_id WHERE child.%I IS NOT NULL AND parent.%I IS NULL)',
      relation.child_schema, relation.child_table, relation.parent_schema, relation.parent_table,
      relation.parent_column, relation.child_column, relation.child_column, relation.parent_column
    ) INTO invalid_reference;
    IF invalid_reference THEN RAISE EXCEPTION 'Cannot enforce tenant integrity for constraint % while cross-tenant rows exist', relation.constraint_name; END IF;
    trigger_name := left('tenant_ref_' || relation.child_table || '_' || relation.child_column, 63);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', trigger_name, relation.child_schema, relation.child_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF organization_id, %I ON %I.%I FOR EACH ROW EXECUTE FUNCTION farm.enforce_same_tenant_reference(%L,%L,%L,%L)',
      trigger_name, relation.child_column, relation.child_schema, relation.child_table,
      relation.parent_schema, relation.parent_table, relation.child_column, relation.parent_column
    );
END LOOP;
END $$;
--> statement-breakpoint
DO $$
DECLARE table_row record;
BEGIN
  FOR table_row IN SELECT tablename FROM pg_tables WHERE schemaname = 'farm'
  LOOP
    EXECUTE format('ALTER TABLE farm.%I FORCE ROW LEVEL SECURITY', table_row.tablename);
  END LOOP;
END $$;
