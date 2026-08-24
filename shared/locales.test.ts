import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedLocale, supportedLocales } from "./locales";

test("shared preferred locales match the published 28-locale Core contract", () => {
  assert.deepEqual(supportedLocales, ["pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el", "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv"]);
  for (const locale of supportedLocales) assert.equal(isSupportedLocale(locale), true);
  assert.equal(isSupportedLocale("pt"), false);
  assert.equal(isSupportedLocale("en-US"), false);
});
