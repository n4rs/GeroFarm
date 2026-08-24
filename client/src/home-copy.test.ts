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
  for (const required of ["Start", "7,90 €", "79 €", "15 ha", "5 plantações ativas", "24,90 €", "249 €", "69,90 €", "699 €", "100 ha", "500 ha", "4,90 €/mês", "sem IVA", "Ligação a ERP de faturação"]) assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(text, /7 dias de tolerância|Integrações futuras permitidas|Inventário e Custos sob proposta/);
  assert.doesNotMatch(text, /conta Gero|GeroCore/i);
  assert.doesNotMatch(JSON.stringify(en), /Gero account|GeroCore/i);
});

test("homepage leads with capabilities and paid privacy controls", () => {
  const text = JSON.stringify(ptPT);
  assert.match(text, /Operações agrícolas completas/);
  assert.match(text, /Privacy by Design incluído/);
  assert.equal(ptPT.hero.title, "Toda a exploração,");
  assert.equal(ptPT.hero.accent, "sob controlo.");
  assert.match(ptPT.hero.description, /simples de usar/);
  assert.match(ptPT.hero.description, /planos acessíveis/);
  assert.match(ptPT.modules.title, /o que tem, o que utiliza e quanto custa/);
  assert.equal(ptPT.privacy.items.length, 7);
  assert.doesNotMatch(text, /Agricultura de campo, ligada|respetivas tags|Exemplos por tag|PDF.*Free|Free.*PDF|Profundidade adaptável|Módulo opcional|Incluída em todos os planos/i);
});

test("field records support assurance evidence without claiming certification", () => {
  const ptLogbook = ptPT.platform.cards[7].description;
  const enLogbook = en.platform.cards[7].description;
  for (const term of ["PRODI", "MPB", "GLOBALG.A.P. IFA", "GRASP", "SPRING"]) assert.match(ptLogbook, new RegExp(term.replaceAll(".", "\\.")));
  assert.match(ptLogbook, /organismo competente/);
  assert.match(enLogbook, /Integrated Pest Management \(IPM\)/);
  assert.match(enLogbook, /organic production/);
  assert.match(enLogbook, /competent certification body/);
});

test("future integrations are not presented as active", () => {
  assert.match(ptPT.faq.items.at(-1)!.a, /Não é apresentada como integração ativa/);
  assert.doesNotMatch(JSON.stringify(ptPT.pricing.plans.slice(1, 3)), /integrações futuras/i);
});

test("Start trial preserves data but gates the real field-record export", () => {
  const start = ptPT.pricing.plans[0];
  assert.equal(start.name, "Start");
  assert.equal(start.monthly, "7,90 €");
  assert.equal(start.annual, "79 €");
  assert.match(ptPT.faq.items[0].a, /mockup/);
  assert.match(ptPT.faq.items[0].a, /não pode ser exportado/);
  assert.match(ptPT.faq.items[0].a, /dados são preservados/);
});

test("every locale has complete translated marketing copy", () => {
  const leaves = (value: unknown): string[] => typeof value === "string" ? [value]
    : Array.isArray(value) ? value.flatMap(leaves)
      : value && typeof value === "object" ? Object.values(value).flatMap(leaves) : [];
  const expectedLeaves = leaves(en).length;
  for (const locale of supportedLocales) {
    const copy = homepageCopies[locale];
    const values = leaves(homepageCopies[locale]);
    assert.equal(values.length, expectedLeaves, `${locale} must preserve the complete copy structure`);
    assert.ok(values.every((value) => value.trim().length > 0), `${locale} must not contain empty messages`);
    assert.ok(!("status" in copy.weather), `${locale} must not show a weather plan-status label`);
    assert.ok(!("optional" in copy.modules), `${locale} must not label Inventory or Costs as optional`);
    for (const term of ["GLOBALG.A.P. IFA", "GRASP", "SPRING"]) assert.match(copy.platform.cards[7].description, new RegExp(term.replaceAll(".", "\\.")), `${locale} must preserve ${term}`);
    if (locale !== "en") {
      assert.notEqual(homepageCopies[locale].metaTitle, en.metaTitle, `${locale} must not fall back to English metadata`);
      assert.doesNotMatch(JSON.stringify(homepageCopies[locale]), /ZXQ|QXZ|\bGrowing\b|\bField record\b|\bView plans\b|\bSign in\b|Inventory and Costs/i, `${locale} contains a generation marker or accidental English phrase`);
    }
  }
});
