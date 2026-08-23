import assert from "node:assert/strict";
import test from "node:test";
import { assertSameOrigin, selectedOrganizationId, setSelectedOrganization } from "./organization-selection";

test("signs and verifies the GeroFarm-only organization cookie", () => {
  const headers: string[] = [];
  const response = { append: (_name: string, value: string) => { headers.push(value); } };
  const organizationId = "9dcd4c57-cb73-4fb2-9b0c-156236301fc9";
  setSelectedOrganization(response as never, organizationId);
  const cookie = headers[0].split(";")[0];
  assert.equal(selectedOrganizationId({ headers: { cookie } } as never), organizationId);
  assert.equal(selectedOrganizationId({ headers: { cookie: `${cookie}forged` } } as never), null);
});

test("rejects cross-origin mutations", () => {
  const request = {
    get: (name: string) => ({ origin: "https://attacker.invalid", host: "farm.gero.pt", "x-forwarded-proto": "https" })[name],
    protocol: "https",
  };
  assert.throws(() => assertSameOrigin(request as never), /Cross-origin/);
});
