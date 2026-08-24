import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { farmHoldingCopies } from "./farm-holding-locales";

test("farm holding module has reviewed key parity in all 28 locales", () => {
  assert.deepEqual(Object.keys(farmHoldingCopies).sort(), [...supportedLocales].sort());
  const keys = Object.keys(farmHoldingCopies.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(farmHoldingCopies[locale]).sort(), keys, locale);
    for (const [key, value] of Object.entries(farmHoldingCopies[locale])) assert.ok(value.trim(), `${locale}.${key}`);
  }
});
