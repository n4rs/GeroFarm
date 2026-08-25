ALTER TABLE "farm"."operations" ADD COLUMN "void_reason" varchar(500);
ALTER TABLE "farm"."operations" ADD COLUMN "voided_at" timestamptz;
ALTER TABLE "farm"."operations" ADD COLUMN "voided_by" uuid;
--> statement-breakpoint
UPDATE "farm"."operations" operation
SET "void_reason"='Historical operation reversal',
    "voided_at"=coalesce((SELECT max(audit.occurred_at) FROM "farm"."audit_events" audit WHERE audit.entity_type='operation' AND audit.entity_id=operation.id),operation.created_at),
    "voided_by"=(SELECT audit.actor_user_id FROM "farm"."audit_events" audit WHERE audit.entity_type='operation' AND audit.entity_id=operation.id ORDER BY audit.occurred_at DESC LIMIT 1)
WHERE operation.status='voided';
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "farm"."operations" WHERE status='voided' AND (void_reason IS NULL OR voided_at IS NULL OR voided_by IS NULL)) THEN
    RAISE EXCEPTION 'Cannot enforce audited operation voiding while legacy voided operations lack an actor';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "farm"."operations" ADD CONSTRAINT "operations_void_state_valid" CHECK (
  (status='performed' AND void_reason IS NULL AND voided_at IS NULL AND voided_by IS NULL)
  OR (status='voided' AND void_reason IS NOT NULL AND voided_at IS NOT NULL AND voided_by IS NOT NULL)
) NOT VALID;
ALTER TABLE "farm"."operations" VALIDATE CONSTRAINT "operations_void_state_valid";
--> statement-breakpoint
CREATE FUNCTION "farm"."protect_operation_void"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='voided' AND (NEW.status<>OLD.status OR NEW.void_reason<>OLD.void_reason OR NEW.voided_at<>OLD.voided_at OR NEW.voided_by<>OLD.voided_by) THEN
    RAISE EXCEPTION 'voided operation audit is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "operation_void_guard" BEFORE UPDATE ON "farm"."operations" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_operation_void"();
--> statement-breakpoint
ALTER TABLE "farm"."operation_consumptions" DROP CONSTRAINT "operation_consumptions_status_valid";
ALTER TABLE "farm"."operation_consumptions" ADD CONSTRAINT "operation_consumptions_status_valid" CHECK (status IN ('pending','allocated','reversed'));
CREATE UNIQUE INDEX "inventory_movements_consumption_lot_reversal_once" ON "farm"."inventory_movements" ("consumption_id","lot_id") WHERE "kind"='adjustment_in' AND "consumption_id" IS NOT NULL;
--> statement-breakpoint
CREATE FUNCTION "farm"."validate_active_operation_cost"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.operation_id IS NOT NULL AND NEW.status='active' AND NOT EXISTS (SELECT 1 FROM "farm"."operations" operation WHERE operation.id=NEW.operation_id AND operation.organization_id=NEW.organization_id AND operation.status='performed') THEN
    RAISE EXCEPTION 'active cost requires a performed operation in the same tenant' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "farm_cost_active_operation_guard" BEFORE INSERT OR UPDATE OF operation_id,organization_id,status ON "farm"."farm_costs" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_active_operation_cost"();
--> statement-breakpoint
ALTER TABLE "farm"."plantations" DROP CONSTRAINT "plantations_status_valid";
ALTER TABLE "farm"."plantations" ADD CONSTRAINT "plantations_status_valid" CHECK (status IN ('active','ended','uprooted','voided'));
--> statement-breakpoint
INSERT INTO "farm"."crop_periods" (id,organization_id,plantation_id,kind,name,started_on,ended_on,status)
SELECT gen_random_uuid(),plantation.organization_id,plantation.id,'cycle',plantation.name,plantation.started_on,plantation.ended_on,
       CASE WHEN plantation.status='active' THEN 'active' ELSE 'closed' END
FROM "farm"."plantations" plantation
WHERE plantation.kind='temporary' AND plantation.status<>'voided'
  AND NOT EXISTS (SELECT 1 FROM "farm"."crop_periods" period WHERE period.plantation_id=plantation.id);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "farm"."crop_periods" left_period JOIN "farm"."crop_periods" right_period
      ON right_period.plantation_id=left_period.plantation_id AND right_period.id>left_period.id
    WHERE daterange(left_period.started_on,coalesce(left_period.ended_on,'infinity'::date),'[]') && daterange(right_period.started_on,coalesce(right_period.ended_on,'infinity'::date),'[]')
  ) THEN RAISE EXCEPTION 'Cannot enforce cultural-period history while overlapping periods exist'; END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "farm"."plantations" left_side
    JOIN "farm"."plantations" right_side ON right_side.organization_id=left_side.organization_id AND right_side.field_id=left_side.field_id AND right_side.id<>left_side.id
    WHERE left_side.status='active' AND right_side.status='active' AND left_side.kind<>right_side.kind
  ) THEN RAISE EXCEPTION 'Cannot enforce plantation-kind compatibility while permanent and temporary main plantations coexist'; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION "farm"."validate_plantation_kind_compatibility"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='active' AND EXISTS (
    SELECT 1 FROM "farm"."plantations" existing
    WHERE existing.organization_id=NEW.organization_id AND existing.field_id=NEW.field_id AND existing.id<>NEW.id
      AND existing.status='active' AND existing.kind<>NEW.kind
  ) THEN RAISE EXCEPTION 'permanent and temporary main plantations cannot coexist in one field' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "plantation_kind_compatibility_guard" BEFORE INSERT OR UPDATE OF field_id,kind,status ON "farm"."plantations" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_plantation_kind_compatibility"();
--> statement-breakpoint
CREATE FUNCTION "farm"."validate_crop_period_lifecycle"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent "farm"."plantations"%ROWTYPE;
BEGIN
  SELECT * INTO parent FROM "farm"."plantations" WHERE id=NEW.plantation_id FOR UPDATE;
  IF NOT FOUND OR parent.organization_id<>NEW.organization_id THEN RAISE EXCEPTION 'cultural period plantation is missing or belongs to another tenant' USING ERRCODE='23503'; END IF;
  IF NEW.kind<>(CASE WHEN parent.kind='permanent' THEN 'campaign' ELSE 'cycle' END) THEN RAISE EXCEPTION 'cultural period kind does not match plantation kind' USING ERRCODE='23514'; END IF;
  IF NEW.started_on<parent.started_on OR (parent.ended_on IS NOT NULL AND coalesce(NEW.ended_on,NEW.started_on)>parent.ended_on) THEN RAISE EXCEPTION 'cultural period is outside plantation lifecycle' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM "farm"."crop_periods" other WHERE other.plantation_id=NEW.plantation_id AND other.id<>NEW.id AND daterange(other.started_on,coalesce(other.ended_on,'infinity'::date),'[]') && daterange(NEW.started_on,coalesce(NEW.ended_on,'infinity'::date),'[]')) THEN RAISE EXCEPTION 'cultural periods cannot overlap or restart on the previous end date' USING ERRCODE='23P01'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "crop_period_lifecycle_guard" BEFORE INSERT OR UPDATE OF plantation_id,organization_id,kind,started_on,ended_on,status ON "farm"."crop_periods" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_crop_period_lifecycle"();
--> statement-breakpoint
REVOKE DELETE ON "farm"."operations", "farm"."crop_periods", "farm"."plantations" FROM "gero_farm_app";
--> statement-breakpoint
CREATE TABLE "farm"."harvest_lot_sequences" (
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "prefix" varchar(32) NOT NULL,
  "next_value" numeric(12,0) DEFAULT 1 NOT NULL
);
CREATE UNIQUE INDEX "harvest_lot_sequences_org_prefix_unique" ON "farm"."harvest_lot_sequences" ("organization_id","prefix");
ALTER TABLE "farm"."harvest_lot_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."harvest_lot_sequences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "harvest_lot_sequences_tenant_isolation" ON "farm"."harvest_lot_sequences" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
GRANT SELECT, INSERT, UPDATE ON "farm"."harvest_lot_sequences" TO "gero_farm_app";
--> statement-breakpoint
CREATE FUNCTION "farm"."validate_laboratory_result_dates"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sample_date date;
BEGIN
  SELECT sampled_on INTO sample_date FROM "farm"."laboratory_samples" WHERE id=NEW.sample_id AND organization_id=NEW.organization_id;
  IF sample_date IS NULL THEN RAISE EXCEPTION 'laboratory result sample is missing or belongs to another tenant' USING ERRCODE='23503'; END IF;
  IF NEW.resulted_on<sample_date OR (NEW.valid_until IS NOT NULL AND NEW.valid_until<NEW.resulted_on) THEN RAISE EXCEPTION 'laboratory result dates are inconsistent' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "laboratory_result_dates_guard" BEFORE INSERT OR UPDATE OF sample_id,organization_id,resulted_on,valid_until ON "farm"."laboratory_results" FOR EACH ROW EXECUTE FUNCTION "farm"."validate_laboratory_result_dates"();
--> statement-breakpoint
ALTER TABLE "farm"."field_notebooks" ADD CONSTRAINT "field_notebooks_number_valid" CHECK (number ~ '^EXP-[0-9]{4}-[0-9]{4,}$') NOT VALID;
