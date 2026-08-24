import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "./home-copy";
import { normalizeLocale } from "./i18n";

test("authenticated locale normalization accepts every Core and homepage locale", () => {
  assert.equal(supportedLocales.length, 28);
  for (const locale of supportedLocales) assert.equal(normalizeLocale(locale), locale);
  assert.equal(normalizeLocale("pt-BR-x-private"), "pt-BR");
  assert.equal(normalizeLocale("iw-IL"), "he");
  assert.equal(normalizeLocale("nn-NO"), "no");
  assert.equal(normalizeLocale("not-supported"), null);
});
