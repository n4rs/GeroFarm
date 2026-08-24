import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { cropCopies } from "./crop-locales.generated";

test("crop module has a complete 28-locale catalogue", () => {
  assert.equal(Object.keys(cropCopies).length, 28);
  const keys = Object.keys(cropCopies.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(cropCopies[locale]).sort(), keys, locale);
    assert.match(cropCopies[locale].records, /\{count\}/, locale);
    for (const value of Object.values(cropCopies[locale])) assert.ok(value.trim(), locale);
  }
});

test("reviewed agronomic crop terms do not regress to image-cropping verbs", () => {
  const forbidden = /^(recadrer|bijsnijden|zuschneiden|crop|ritaglia|decupați|rajaa|izрязване|apkarpyti|apgriezt)$/iu;
  for (const locale of supportedLocales.filter((candidate) => candidate !== "en")) assert.doesNotMatch(cropCopies[locale].crop, forbidden, locale);
});
