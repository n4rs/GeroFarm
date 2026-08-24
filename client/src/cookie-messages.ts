import { cookieMessages } from "./legal-locales/cookies-index";
import type { SupportedLocale } from "./home-copy";

export function cookieMessage(locale: SupportedLocale, key: string) {
  const messages = cookieMessages[locale] as Record<string, string>;
  return messages[key] ?? (cookieMessages.en as Record<string, string>)[key] ?? key;
}
