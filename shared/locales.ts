export const supportedLocales = [
  "pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el",
  "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv",
] as const;

export type SupportedLocale = typeof supportedLocales[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (supportedLocales as readonly string[]).includes(value);
}
