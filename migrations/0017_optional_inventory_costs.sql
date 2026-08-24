CREATE TABLE "farm"."inventory_products" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "code" varchar(24) NOT NULL,
  "name" varchar(180) NOT NULL,
  "unit" varchar(24) NOT NULL,
  "lot_tracking" boolean DEFAULT false NOT NULL,
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_products_status_valid" CHECK ("status" in ('active','inactive')),
  CONSTRAINT "inventory_products_code_valid" CHECK ("code" ~ '^[A-Z0-9-]{2,24}$'),
  CONSTRAINT "inventory_products_org_code_unique" UNIQUE("organization_id","code")
);
--> statement-breakpoint
CREATE TABLE "farm"."inventory_lots" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "product_id" uuid NOT NULL REFERENCES "farm"."inventory_products"("id"),
  "lot_number" varchar(100) NOT NULL,
  "supplier" varchar(180),
  "origin_document" varchar(120),
  "received_on" date NOT NULL,
  "received_quantity" numeric(18,4) NOT NULL,
  "available_quantity" numeric(18,4) NOT NULL,
  "unit_cost" numeric(18,6),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_lots_quantity_valid" CHECK ("received_quantity" > 0 AND "available_quantity" >= 0 AND "available_quantity" <= "received_quantity"),
  CONSTRAINT "inventory_lots_unit_cost_valid" CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0),
  CONSTRAINT "inventory_lots_org_product_lot_unique" UNIQUE("organization_id","product_id","lot_number")
);
--> statement-breakpoint
CREATE TABLE "farm"."operation_consumptions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "operation_id" uuid NOT NULL REFERENCES "farm"."operations"("id"),
  "product_id" uuid NOT NULL REFERENCES "farm"."inventory_products"("id"),
  "requested_quantity" numeric(18,4) NOT NULL,
  "allocated_quantity" numeric(18,4) DEFAULT 0 NOT NULL,
  "unit" varchar(24) NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "regularized_at" timestamptz,
  CONSTRAINT "operation_consumptions_quantity_valid" CHECK ("requested_quantity" > 0 AND "allocated_quantity" >= 0 AND "allocated_quantity" <= "requested_quantity"),
  CONSTRAINT "operation_consumptions_status_valid" CHECK ("status" in ('pending','allocated')),
  CONSTRAINT "operation_consumptions_org_operation_product_unique" UNIQUE("organization_id","operation_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "farm"."inventory_movements" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "product_id" uuid NOT NULL REFERENCES "farm"."inventory_products"("id"),
  "lot_id" uuid REFERENCES "farm"."inventory_lots"("id"),
  "consumption_id" uuid REFERENCES "farm"."operation_consumptions"("id"),
  "kind" varchar(20) NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "unit_cost_snapshot" numeric(18,6),
  "occurred_at" timestamptz NOT NULL,
  "reason" varchar(500),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_movements_kind_valid" CHECK ("kind" in ('receipt','consumption','adjustment_in','adjustment_out')),
  CONSTRAINT "inventory_movements_quantity_valid" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_movements_cost_valid" CHECK ("unit_cost_snapshot" IS NULL OR "unit_cost_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "farm"."farm_costs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "farm"."organizations"("organization_id"),
  "operation_id" uuid REFERENCES "farm"."operations"("id"),
  "category" varchar(24) NOT NULL,
  "description" varchar(240) NOT NULL,
  "net_amount" numeric(18,2) NOT NULL,
  "tax_amount" numeric(18,2) DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'EUR' NOT NULL,
  "occurred_on" date NOT NULL,
  "allocation_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "farm_costs_category_valid" CHECK ("category" in ('material','labour','equipment','contractor','fuel','fixed','other')),
  CONSTRAINT "farm_costs_amount_valid" CHECK ("net_amount" >= 0 AND "tax_amount" >= 0),
  CONSTRAINT "farm_costs_currency_valid" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "farm_costs_status_valid" CHECK ("status" in ('active','reversed')),
  CONSTRAINT "farm_costs_allocation_valid" CHECK (jsonb_typeof("allocation_snapshot") = 'array')
);
--> statement-breakpoint
CREATE INDEX "inventory_products_org_status_idx" ON "farm"."inventory_products"("organization_id","status");
CREATE INDEX "inventory_lots_org_product_idx" ON "farm"."inventory_lots"("organization_id","product_id");
CREATE INDEX "operation_consumptions_org_status_idx" ON "farm"."operation_consumptions"("organization_id","status");
CREATE INDEX "inventory_movements_org_date_idx" ON "farm"."inventory_movements"("organization_id","occurred_at");
CREATE UNIQUE INDEX "inventory_movements_receipt_once" ON "farm"."inventory_movements"("lot_id") WHERE "kind"='receipt';
CREATE UNIQUE INDEX "inventory_movements_consumption_lot_once" ON "farm"."inventory_movements"("consumption_id","lot_id") WHERE "kind"='consumption';
CREATE INDEX "farm_costs_org_date_idx" ON "farm"."farm_costs"("organization_id","occurred_on");
CREATE INDEX "farm_costs_org_operation_idx" ON "farm"."farm_costs"("organization_id","operation_id");
--> statement-breakpoint
ALTER TABLE "farm"."inventory_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."inventory_lots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."operation_consumptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm"."farm_costs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_products_tenant_isolation" ON "farm"."inventory_products" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
CREATE POLICY "inventory_lots_tenant_isolation" ON "farm"."inventory_lots" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
CREATE POLICY "operation_consumptions_tenant_isolation" ON "farm"."operation_consumptions" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
CREATE POLICY "inventory_movements_tenant_isolation" ON "farm"."inventory_movements" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
CREATE POLICY "farm_costs_tenant_isolation" ON "farm"."farm_costs" AS RESTRICTIVE FOR ALL TO public USING ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK ("organization_id"=nullif(current_setting('app.organization_id',true),'')::uuid);
--> statement-breakpoint
CREATE FUNCTION "farm"."protect_inventory_ledger"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'inventory ledger rows are immutable'; END $$;
CREATE TRIGGER "inventory_movements_immutable" BEFORE UPDATE OR DELETE ON "farm"."inventory_movements" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_inventory_ledger"();
CREATE TRIGGER "farm_costs_no_delete" BEFORE DELETE ON "farm"."farm_costs" FOR EACH ROW EXECUTE FUNCTION "farm"."protect_inventory_ledger"();
--> statement-breakpoint
REVOKE DELETE ON "farm"."inventory_products", "farm"."inventory_lots", "farm"."operation_consumptions", "farm"."inventory_movements", "farm"."farm_costs" FROM PUBLIC;
