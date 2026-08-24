import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../home-copy";
import { entitlementCopies } from "./entitlements/entitlement-locales";
test("entitlement usage, limits and checkout guidance have native copy in all 28 locales",()=>{assert.equal(Object.keys(entitlementCopies).length,28);assert.deepEqual(Object.keys(entitlementCopies).sort(),[...supportedLocales].sort());for(const locale of supportedLocales){for(const [key,value] of Object.entries(entitlementCopies[locale]))assert.ok(value.trim(),`${locale}:${key}`)}assert.notEqual(entitlementCopies.ar.limitReached,entitlementCopies.en.limitReached);assert.notEqual(entitlementCopies.ja.managePlan,entitlementCopies.en.managePlan)});
