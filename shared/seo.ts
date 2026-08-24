export const seoLocales = [
  "pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el",
  "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv",
] as const;

export type SeoLocale = typeof seoLocales[number];

export const seoLocaleSlugs: Record<SeoLocale, string> = {
  "pt-PT": "pt-pt",
  "pt-BR": "pt-br",
  en: "en",
  fr: "fr",
  es: "es",
  nl: "nl",
  de: "de",
  ja: "ja",
  he: "he",
  tr: "tr",
  ar: "ar",
  pl: "pl",
  hr: "hr",
  el: "el",
  sv: "sv",
  no: "no",
  da: "da",
  it: "it",
  uk: "uk",
  ro: "ro",
  fi: "fi",
  bg: "bg",
  hu: "hu",
  is: "is",
  sk: "sk",
  lt: "lt",
  sl: "sl",
  lv: "lv",
};

export const rtlSeoLocales = new Set<SeoLocale>(["ar", "he"]);

export function seoLocaleFromPath(pathname: string): SeoLocale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!firstSegment) return null;
  return seoLocales.find((locale) => seoLocaleSlugs[locale] === firstSegment) || null;
}

export function seoLocaleFromValue(value?: string | null): SeoLocale | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return seoLocales.find((locale) =>
    locale.toLowerCase() === normalized || seoLocaleSlugs[locale] === normalized,
  ) || null;
}

export function localizedSeoPath(locale: SeoLocale): string {
  return `/${seoLocaleSlugs[locale]}/`;
}

export function isLocalizedHomepage(pathname: string): boolean {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return seoLocales.some((locale) => normalized === localizedSeoPath(locale));
}

export function isPublicSeoHomepage(pathname: string): boolean {
  return pathname === "/" || isLocalizedHomepage(pathname);
}
