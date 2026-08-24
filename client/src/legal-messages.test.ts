import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "./home-copy";
import { legalDocumentKind } from "./legal-routes";
import { legalMessage } from "./legal-messages";

test("recognizes only the three public legal routes", () => {
  assert.equal(legalDocumentKind("/privacy-policy"), "privacy");
  assert.equal(legalDocumentKind("/terms/"), "terms");
  assert.equal(legalDocumentKind("/cookie-policy"), "cookies");
  assert.equal(legalDocumentKind("/gdpr-procedures"), null);
});

test("all 28 locales include the legal and consent interface", () => {
  for (const locale of supportedLocales) {
    for (const key of ["legal.privacy.title", "legal.terms.title", "legal.cookies.title", "cookies.acceptAll", "cookies.rejectOptional", "cookies.customize", "cookies.manage"]) {
      assert.notEqual(legalMessage(locale, key), key, `${locale} is missing ${key}`);
    }
  }
});
