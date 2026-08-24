export const COOKIE_CONSENT_VERSION = "2026-08-24";
export const COOKIE_CONSENT_STORAGE_KEY = "gerofarm_cookie_consent";
export const COOKIE_PREFERENCES_EVENT = "gerofarm:open-cookie-preferences";
export const COOKIE_CONSENT_CHANGED_EVENT = "gerofarm:cookie-consent-changed";
export const COOKIE_CONSENT_MAX_AGE_DAYS = 180;

export type OptionalCookieCategory = "preferences" | "analytics" | "marketing";
export type CookieConsentSource = "banner" | "preferences" | "global_privacy_control";

export type CookieConsentRecord = {
  version: string;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  globalPrivacyControl: boolean;
  source: CookieConsentSource;
  decidedAt: string;
  expiresAt: string;
};

function storageAvailable() { return typeof window !== "undefined" && typeof window.localStorage !== "undefined"; }
export function globalPrivacyControlEnabled() { return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true; }

export function parseCookieConsent(value: string | null, now = new Date()): CookieConsentRecord | null {
  if (!value) return null;
  try {
    const record = JSON.parse(value) as Partial<CookieConsentRecord>;
    if (record.version !== COOKIE_CONSENT_VERSION || record.necessary !== true) return null;
    if (typeof record.preferences !== "boolean" || typeof record.analytics !== "boolean" || typeof record.marketing !== "boolean") return null;
    if (!record.source || !["banner", "preferences", "global_privacy_control"].includes(record.source)) return null;
    if (typeof record.decidedAt !== "string" || !Number.isFinite(new Date(record.decidedAt).getTime())) return null;
    if (typeof record.expiresAt !== "string" || new Date(record.expiresAt).getTime() <= now.getTime()) return null;
    return { ...record, version: COOKIE_CONSENT_VERSION, necessary: true, globalPrivacyControl: record.globalPrivacyControl === true } as CookieConsentRecord;
  } catch { return null; }
}

export function readCookieConsent(now = new Date()) {
  if (!storageAvailable()) return null;
  const record = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY), now);
  if (!record || !globalPrivacyControlEnabled() || !record.marketing) return record;
  return saveCookieConsent({ preferences: record.preferences, analytics: record.analytics, marketing: false }, "global_privacy_control", now);
}

export function saveCookieConsent(choices: Pick<CookieConsentRecord, OptionalCookieCategory>, source: CookieConsentSource, now = new Date()): CookieConsentRecord {
  const gpc = globalPrivacyControlEnabled();
  const expiresAt = new Date(now); expiresAt.setUTCDate(expiresAt.getUTCDate() + COOKIE_CONSENT_MAX_AGE_DAYS);
  const record: CookieConsentRecord = { version: COOKIE_CONSENT_VERSION, necessary: true, ...choices, marketing: gpc ? false : choices.marketing, globalPrivacyControl: gpc, source: gpc && choices.marketing ? "global_privacy_control" : source, decidedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
  if (storageAvailable()) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: record }));
  }
  return record;
}

export function openCookiePreferences() { if (typeof window !== "undefined") window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT)); }
