DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "farm"."farm_holdings"
    GROUP BY "organization_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one agricultural holding per organization while duplicate holdings exist';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "farm_holdings_organization_unique" ON "farm"."farm_holdings" USING btree ("organization_id");
