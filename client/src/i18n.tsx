import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { homepageCopies } from "./home-locales.generated";
import { supportedLocales, type HomepageCopy, type SupportedLocale } from "./home-copy";
import { isPublicSeoHomepage, localizedSeoPath, seoLocaleFromPath } from "@shared/seo";

const nativeNames: Record<SupportedLocale, string> = {
  "pt-PT": "Português (Portugal)", "pt-BR": "Português (Brasil)", en: "English", fr: "Français", es: "Español", nl: "Nederlands", de: "Deutsch", ja: "日本語", he: "עברית", tr: "Türkçe", ar: "العربية", pl: "Polski", hr: "Hrvatski", el: "Ελληνικά", sv: "Svenska", no: "Norsk", da: "Dansk", it: "Italiano", uk: "Українська", ro: "Română", fi: "Suomi", bg: "Български", hu: "Magyar", is: "Íslenska", sk: "Slovenčina", lt: "Lietuvių", sl: "Slovenščina", lv: "Latviešu",
};
const rtl = new Set<SupportedLocale>(["ar", "he"]);
const storageKey = "gerofarm_locale";

export function normalizeLocale(value?: string | null): SupportedLocale | null {
  const candidate = value?.toLowerCase();
  if (!candidate) return null;
  const exact = supportedLocales.find((locale) => locale.toLowerCase() === candidate);
  if (exact) return exact;
  if (candidate.startsWith("pt-br")) return "pt-BR";
  if (candidate.startsWith("pt")) return "pt-PT";
  if (candidate.startsWith("nb") || candidate.startsWith("nn")) return "no";
  if (candidate.startsWith("iw")) return "he";
  return supportedLocales.find((locale) => candidate.startsWith(locale.toLowerCase())) ?? null;
}

export function detectLocale(search = window.location.search, languages = navigator.languages): SupportedLocale {
  const fromPath = seoLocaleFromPath(window.location.pathname);
  if (fromPath) return fromPath;
  const fromUrl = normalizeLocale(new URLSearchParams(search).get("lang"));
  if (fromUrl) return fromUrl;
  const stored = normalizeLocale(localStorage.getItem(storageKey));
  if (stored) return stored;
  for (const language of languages) { const match = normalizeLocale(language); if (match) return match; }
  return "en";
}

type I18nValue = { locale: SupportedLocale; copy: HomepageCopy; setLocale: (locale: SupportedLocale) => void; options: Array<{ code: SupportedLocale; label: string }> };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, preferredLocale }: { children: ReactNode; preferredLocale?: string | null }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => detectLocale());
  const setLocale = (next: SupportedLocale) => {
    localStorage.setItem(storageKey, next);
    if (isPublicSeoHomepage(window.location.pathname)) {
      window.location.assign(localizedSeoPath(next));
      return;
    }
    const url = new URL(window.location.href); url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
    setLocaleState(next);
  };
  useEffect(() => {
    const manual = normalizeLocale(new URLSearchParams(window.location.search).get("lang")) || normalizeLocale(localStorage.getItem(storageKey));
    const account = normalizeLocale(preferredLocale);
    if (!manual && account) setLocaleState(account);
  }, [preferredLocale]);
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = rtl.has(locale) ? "rtl" : "ltr"; }, [locale]);
  const value = useMemo<I18nValue>(() => ({ locale, copy: homepageCopies[locale], setLocale, options: supportedLocales.map((code) => ({ code, label: nativeNames[code] })) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const value = useContext(I18nContext); if (!value) throw new Error("useI18n must be used within I18nProvider"); return value; }
