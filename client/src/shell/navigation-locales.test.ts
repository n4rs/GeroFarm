import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../home-copy";
import { navigationGroupCopies } from "./navigation-locales";

test("task-oriented navigation groups cover every supported locale", () => {
  assert.deepEqual(Object.keys(navigationGroupCopies).sort(), [...supportedLocales].sort());
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(navigationGroupCopies[locale]).sort(), ["analysis", "management", "operation", "overview", "settings"]);
    for (const value of Object.values(navigationGroupCopies[locale])) assert.ok(value.trim(), locale);
  }
});
