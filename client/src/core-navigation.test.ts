import assert from "node:assert/strict";
import test from "node:test";
import { applicationReturnTo, organizationHandoff, reservedApplicationHandoff } from "./core-navigation";

test("accepts and removes a valid organization handoff", () => {
  assert.deepEqual(
    organizationHandoff("https://farm.gero.pt/app?organizationId=9dcd4c57-cb73-4fb2-9b0c-156236301fc9&tab=home"),
    { requested: true, organizationId: "9dcd4c57-cb73-4fb2-9b0c-156236301fc9", cleanUrl: "https://farm.gero.pt/app?tab=home" },
  );
});

test("builds a same-origin application return target", () => {
  assert.equal(applicationReturnTo("https://farm.gero.pt/app?organizationId=9dcd4c57-cb73-4fb2-9b0c-156236301fc9"), "https://farm.gero.pt/app");
});

test("moves a Core application handoff from the public root into the workspace", () => {
  assert.equal(
    reservedApplicationHandoff("https://farm.gero.pt/?organizationId=9dcd4c57-cb73-4fb2-9b0c-156236301fc9"),
    "https://farm.gero.pt/app?organizationId=9dcd4c57-cb73-4fb2-9b0c-156236301fc9",
  );
});
