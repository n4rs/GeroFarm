import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { operationExtensionCopies, operationExtensionMessage } from "./operation-extension-locales";

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test("operation extension catalogue covers every locale, key and placeholder", () => {
  const keys = Object.keys(operationExtensionCopies.en).sort();
  assert.deepEqual(Object.keys(operationExtensionCopies).sort(), [...supportedLocales].sort());
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(operationExtensionCopies[locale]).sort(), keys, locale);
    for (const key of keys) {
      const value = operationExtensionCopies[locale][key as keyof typeof operationExtensionCopies.en];
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(placeholders(value), placeholders(operationExtensionCopies.en[key as keyof typeof operationExtensionCopies.en]), `${locale}.${key}`);
      if (locale !== "en" && value.length >= 18) assert.notEqual(value, operationExtensionCopies.en[key as keyof typeof operationExtensionCopies.en], `${locale}.${key}`);
    }
  }
  assert.equal(operationExtensionMessage(operationExtensionCopies.en.voidOperation, { code: "OP-42" }), "Void OP-42");
});
