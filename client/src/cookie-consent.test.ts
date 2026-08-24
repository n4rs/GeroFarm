import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE_CONSENT_MAX_AGE_DAYS, COOKIE_CONSENT_VERSION, parseCookieConsent } from "./cookie-consent";

const now = new Date("2026-08-24T12:00:00.000Z");
const valid = { version: COOKIE_CONSENT_VERSION, necessary: true, preferences: false, analytics: false, marketing: false, globalPrivacyControl: false, source: "banner", decidedAt: now.toISOString(), expiresAt: new Date(now.getTime() + COOKIE_CONSENT_MAX_AGE_DAYS * 86400000).toISOString() };

test("cookie consent accepts a complete current record", () => assert.deepEqual(parseCookieConsent(JSON.stringify(valid), now), valid));
test("cookie consent rejects expired, obsolete and malformed records", () => {
  assert.equal(parseCookieConsent(JSON.stringify({ ...valid, expiresAt: now.toISOString() }), now), null);
  assert.equal(parseCookieConsent(JSON.stringify({ ...valid, version: "old" }), now), null);
  assert.equal(parseCookieConsent("not-json", now), null);
});
