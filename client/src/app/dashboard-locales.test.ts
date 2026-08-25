import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../home-copy";
import { dashboardCopies } from "./dashboard-locales";

test("question-led dashboard copy covers all supported locales", () => {
  assert.deepEqual(Object.keys(dashboardCopies).sort(), [...supportedLocales].sort());
  const keys = Object.keys(dashboardCopies.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(dashboardCopies[locale]).sort(), keys, locale);
    for (const value of Object.values(dashboardCopies[locale])) assert.ok(value.trim(), locale);
  }
});
