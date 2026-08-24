import { legalMessages } from "./legal-locales";
import type { SupportedLocale } from "./home-copy";

export function legalMessage(locale: SupportedLocale, key: string) {
  const messages = legalMessages[locale] as Record<string, string>;
  return messages[key] ?? (legalMessages.en as Record<string, string>)[key] ?? key;
}
