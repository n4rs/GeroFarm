import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../../home-copy";
import { privacyCopies } from "./privacy-locales.generated";

test("Privacy by Design reuses the complete reviewed GeroHydro catalogue in all 28 locales", () => { const keys = Object.keys(privacyCopies.en).sort(); for (const locale of supportedLocales) { assert.deepEqual(Object.keys(privacyCopies[locale]).sort(), keys, locale); for (const value of Object.values(privacyCopies[locale])) assert.ok(value.trim(), locale); if (locale !== "en") { for (const key of ["privacy.description", "privacy.managerTitle", "privacy.ownerRecovery", "retention.category.audit_logs"] as const) assert.doesNotMatch(privacyCopies[locale][key], /Privacy Manager|Audit logs/u, `${locale}.${key}`); } } });
