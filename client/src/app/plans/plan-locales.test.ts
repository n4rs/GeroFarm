import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { planEnglishCopy } from "./plan-copy-source";
import { planCopies } from "./plan-locales.generated";

test("fertilization plans have complete copy parity with the homepage locales", () => {
  assert.deepEqual(Object.keys(planCopies), supportedLocales);
  const keys = Object.keys(planEnglishCopy);
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(planCopies[locale]).sort(), [...keys].sort(), `${locale} plan keys`);
    for (const count of [0,1,2,3,5,11,21,101]) {
      const category = new Intl.PluralRules(locale).select(count);
      const key = `field${category[0].toUpperCase()}${category.slice(1)}` as keyof typeof planCopies[typeof locale];
      assert.ok(planCopies[locale][key].includes("{count}"), `${locale} field-plan ${category}`);
    }
  }
});

test("Portuguese variants preserve agronomic terminology and gender", () => {
  assert.equal(planCopies["pt-PT"].title, "Planos de fertilização");
  assert.equal(planCopies["pt-BR"].title, "Planos de adubação");
  assert.equal(planCopies["pt-PT"].inForce, "Em vigor");
  assert.equal(planCopies["pt-PT"].superseded, "Substituído");
});
