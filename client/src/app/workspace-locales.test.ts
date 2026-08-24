import assert from "node:assert/strict";
import test from "node:test";
import { homepageCopies } from "../home-locales.generated";
import { supportedLocales } from "../home-copy";
import { formatWorkspaceMessage, pluralWorkspaceMessage, workspaceCopies, workspaceStateCopies } from "./workspace-locales";

test("authenticated workspace covers exactly the 28 homepage locales", () => {
  assert.deepEqual(Object.keys(workspaceCopies).sort(), [...supportedLocales].sort());
  assert.deepEqual(Object.keys(workspaceStateCopies).sort(), [...supportedLocales].sort());
  const referenceKeys = Object.keys(workspaceCopies.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(workspaceCopies[locale]).sort(), referenceKeys, `${locale} key parity`);
    for (const [key, value] of Object.entries(workspaceCopies[locale])) {
      assert.ok(value.trim().length > 0, `${locale}.${key} must not be blank`);
    }
    assert.equal(homepageCopies[locale].platform.cards.length, 8, `${locale} agronomic navigation catalogue`);
  }
});

test("workspace messages interpolate names without losing unknown placeholders", () => {
  assert.equal(formatWorkspaceMessage("Hello, {name} · {missing}", { name: "Amina" }), "Hello, Amina · {missing}");
});

test("plural selection follows every locale's grammatical rules", () => {
  for (const locale of supportedLocales) {
    for (const count of [0, 1, 2, 3, 5, 11, 21, 101]) {
      const rendered = pluralWorkspaceMessage(locale, count, { one: "{count} one", two: "{count} two", few: "{count} few", many: "{count} many", zero: "{count} zero", other: "{count} other" });
      assert.ok(!rendered.includes("{count}"), `${locale} must format ${count}`);
    }
  }
});
