import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { idempotencyRequestHeaders } from "./idempotency";

test("browser installs keys only for the shared critical-mutation policy", async () => {
  const [main, helper, policy] = await Promise.all([readFile(new URL("./main.tsx", import.meta.url), "utf8"), readFile(new URL("./idempotency.ts", import.meta.url), "utf8"), readFile(new URL("../../shared/idempotency.ts", import.meta.url), "utf8")]);
  assert.match(main, /installMutationIdempotency\(\)/u);
  assert.match(helper, /idempotentMutationPolicy\(method, url\.pathname\)/u);
  assert.match(helper, /crypto\.randomUUID\(\)/u);
  assert.match(helper, /idempotency-key/u);
  assert.match(policy, /\/api\\\/farm\\\/operations/u);
  assert.doesNotMatch(policy, /api\\\/auth|api\\\/billing|field-notebooks\\\/xlsx/u);
});

test("internal fetch compatibility covers critical mutations without touching auth, Core or exports", () => {
  const origin = "https://farm.gero.pt", key = () => "abcdefgh-1234";
  assert.equal(idempotencyRequestHeaders("POST", "/api/farm/operations", { "content-type": "application/json" }, origin, key).get("idempotency-key"), "abcdefgh-1234");
  assert.equal(idempotencyRequestHeaders("POST", "/api/weather/campaigns/11111111-1111-4111-8111-111111111111/agronomic-profiles", undefined, origin, key).get("idempotency-key"), "abcdefgh-1234");
  for (const path of ["/api/auth/logout", "/api/auth/select-organization", "/api/billing/checkout", "/api/farm/field-notebooks/current", "/api/farm/field-notebooks/xlsx"]) {
    assert.equal(idempotencyRequestHeaders("POST", path, undefined, origin, key).has("idempotency-key"), false, path);
  }
  assert.equal(idempotencyRequestHeaders("POST", "https://core.gero.pt/api/session", undefined, origin, key).has("idempotency-key"), false);
});
