import assert from "node:assert/strict";
import test from "node:test";
import { en, ptPT, supportedLocales } from "./home-copy";
import { homepageCopies } from "./home-locales.generated";
import { normalizeLocale } from "./i18n";

test("supports exactly the Gero product locale catalogue", () => {
  assert.deepEqual(supportedLocales, ["pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el", "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv"]);
  assert.equal(normalizeLocale("pt"), "pt-PT");
  assert.equal(normalizeLocale("pt-BR"), "pt-BR");
  assert.equal(normalizeLocale("iw-IL"), "he");
  assert.equal(normalizeLocale("nb-NO"), "no");
});

test("approved commercial limits and prices are present", () => {
  const text = JSON.stringify(ptPT);
  for (const required of ["24,90 €", "249 €", "69,90 €", "699 €", "10 ha", "100 ha", "500 ha", "7 dias", "4,90 €/mês", "sem IVA", "GeroGrid"]) assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(text, /conta Gero|GeroCore/i);
  assert.doesNotMatch(JSON.stringify(en), /Gero account|GeroCore/i);
});

test("future integrations are not presented as active", () => {
  assert.match(ptPT.pricing.description, /futuras/);
  assert.match(ptPT.faq.items.at(-1)!.a, /Não é apresentada como integração ativa/);
});

test("every locale has complete translated marketing copy", () => {
  const leaves = (value: unknown): string[] => typeof value === "string" ? [value]
    : Array.isArray(value) ? value.flatMap(leaves)
      : value && typeof value === "object" ? Object.values(value).flatMap(leaves) : [];
  const expectedLeaves = leaves(en).length;
  for (const locale of supportedLocales) {
    const values = leaves(homepageCopies[locale]);
    assert.equal(values.length, expectedLeaves, `${locale} must preserve the complete copy structure`);
    assert.ok(values.every((value) => value.trim().length > 0), `${locale} must not contain empty messages`);
    if (locale !== "en") {
      assert.notEqual(homepageCopies[locale].metaTitle, en.metaTitle, `${locale} must not fall back to English metadata`);
      assert.doesNotMatch(JSON.stringify(homepageCopies[locale]), /ZXQ|QXZ|\bGrowing\b|\bField record\b|\bView plans\b|\bSign in\b|Inventory and Costs/i, `${locale} contains a generation marker or accidental English phrase`);
    }
  }
});
