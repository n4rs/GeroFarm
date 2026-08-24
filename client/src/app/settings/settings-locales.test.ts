import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { entitlementValueEnabled, settingsCoreLinks } from "./settings-links";
import { settingsCopies, settingsMessage } from "./settings-locales";

function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test("settings has a complete independent catalogue for the same 28 locales", () => {
  assert.equal(supportedLocales.length, 28);
  assert.deepEqual(Object.keys(settingsCopies).sort(), [...supportedLocales].sort());
  const keys = Object.keys(settingsCopies.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(settingsCopies[locale]).sort(), keys, `${locale} key parity`);
    for (const [key, value] of Object.entries(settingsCopies[locale])) {
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(placeholders(value), placeholders(settingsCopies.en[key as keyof typeof settingsCopies.en]), `${locale}.${key} placeholders`);
    }
  }
});

test("critical settings guidance is localized without an English fallback", () => {
  for (const locale of supportedLocales.filter((code) => code !== "en")) {
    for (const key of ["subtitle", "centralNotice", "manageProfile", "manageSecurity", "languageDescription", "saveLanguage", "saveError"] as const) {
      assert.notEqual(settingsCopies[locale][key], settingsCopies.en[key], `${locale}.${key}`);
    }
  }
  assert.match(settingsCopies["pt-PT"].centralNotice, /Gero Core/u);
  assert.match(settingsCopies.ar.languageDescription, /ملف/u);
  assert.match(settingsCopies.he.manageSecurity, /אבטחה/u);
  assert.equal(settingsCopies.ro.centralNotice, "Contul, organizația, securitatea, abonamentul și permisiunile sunt sursele oficiale în Gero Core.");
  assert.match(settingsCopies.bg.centralNotice, /официален източник/u);
  assert.equal(settingsCopies.el.modules, "Ενότητες");
  assert.equal(settingsCopies.fi.opensCore, "Avaa Gero Core -palvelun");
  assert.equal(settingsCopies.no.noSubscription, "Intet abonnement");
  assert.equal(settingsCopies.no.expires, "Utløper {date}");
  assert.equal(settingsCopies.sv.expires, "Upphör {date}");
  assert.equal(settingsCopies.da.expires, "Udløber {date}");
  assert.doesNotMatch(Object.values(settingsCopies).flatMap(Object.values).join("\n"), /authoritative în|авторитетни|Μονάδες|Ingen abonnement|Slutar \{date\}|Avaa Gero Coren|forblir autoritative/u);
});

test("settings placeholders remain intact and module entitlement values are not invented", () => {
  assert.equal(settingsMessage("Ends {date} · {missing}", { date: "24/08/2026" }), "Ends 24/08/2026 · {missing}");
  assert.equal(entitlementValueEnabled(true), true);
  assert.equal(entitlementValueEnabled("after_trial"), true);
  for (const value of [false, null, undefined, 0, ""]) assert.equal(entitlementValueEnabled(value), false);
});

test("central settings links accept only credential-free HTTP origins", () => {
  assert.deepEqual(settingsCoreLinks({ coreUrl: "https://core.gero.pt", loginUrl: "", registerUrl: "", applicationSelectorUrl: "", accountUrl: "https://account.gero.pt/account", administrationUrl: "https://core.gero.pt/dashboard" }), {
    account: "https://account.gero.pt/account",
    profile: "https://account.gero.pt/account#profile",
    organizations: "https://account.gero.pt/account#organizations",
    security: "https://account.gero.pt/account/security",
    administration: "https://core.gero.pt/dashboard",
  });
  const rejected = settingsCoreLinks({ coreUrl: "", loginUrl: "", registerUrl: "", applicationSelectorUrl: "", accountUrl: "https://user:secret@account.gero.pt/account", administrationUrl: "javascript:alert(1)" });
  assert.deepEqual(rejected, { account: null, profile: null, organizations: null, security: null, administration: null });
});
