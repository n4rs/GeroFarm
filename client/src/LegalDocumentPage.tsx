import { useEffect } from "react";
import { supportedLocales, type SupportedLocale } from "./home-copy";
import { legalMessage } from "./legal-messages";
import { useI18n } from "./i18n";
import type { LegalDocumentKind } from "./legal-routes";

const privacySections = ["controller", "scope", "data", "purposes", "legalBases", "customerContent", "recipients", "transfers", "retention", "rights", "security", "changes", "contact"] as const;
const termsSections = ["operator", "businessUse", "accounts", "service", "customerDuties", "acceptableUse", "plans", "renewal", "freeOffers", "customerData", "processing", "subprocessors", "intellectualProperty", "confidentiality", "availability", "suspension", "liability", "changes", "law", "contact"] as const;
const cookieSections = ["controller", "legalBasis", "duration", "choices", "gpc", "international", "changes", "contact"] as const;

export default function LegalDocumentPage({ kind }: { kind: LegalDocumentKind }) {
  const { locale, copy, setLocale, options } = useI18n(); const t = (key: string) => legalMessage(locale, key);
  const sections = kind === "privacy" ? privacySections : kind === "terms" ? termsSections : cookieSections;
  const title = t(`legal.${kind}.title`);
  const intro = kind === "privacy" ? copy.metaDescription : t(`legal.${kind}.intro`);
  const body = (section: string) => kind === "terms" && section === "service" ? copy.platform.description : kind === "terms" && section === "freeOffers" ? copy.faq.items[0]?.a || t(`legal.${kind}.${section}.body`) : t(`legal.${kind}.${section}.body`);

  useEffect(() => {
    document.title = `${title} · GeroFarm`;
    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => { let element = document.head.querySelector<HTMLMetaElement>(selector); if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.appendChild(element); } element.content = content; };
    setMeta('meta[name="description"]', "name", "description", intro); setMeta('meta[property="og:title"]', "property", "og:title", document.title); setMeta('meta[property="og:description"]', "property", "og:description", intro);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); } canonical.href = `${window.location.origin}${window.location.pathname}${locale === "pt-PT" ? "" : `?lang=${locale}`}`;
    document.head.querySelectorAll('link[rel="alternate"][data-gerofarm]').forEach((node) => node.remove());
    for (const code of supportedLocales) { const link = document.createElement("link"); link.rel = "alternate"; link.hreflang = code; link.href = `${window.location.origin}${window.location.pathname}?lang=${code}`; link.dataset.gerofarm = "true"; document.head.appendChild(link); }
    const fallback = document.createElement("link"); fallback.rel = "alternate"; fallback.hreflang = "x-default"; fallback.href = `${window.location.origin}${window.location.pathname}?lang=en`; fallback.dataset.gerofarm = "true"; document.head.appendChild(fallback);
  }, [intro, locale, title]);

  return <div className="legal-shell"><header className="legal-header"><div className="shell legal-header-inner"><a href="/" className="brand" aria-label="GeroFarm"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm"/></a><nav aria-label={t("legal.navigation")}><a className={kind === "privacy" ? "active" : ""} href={`/privacy-policy?lang=${locale}`}>{t("legal.privacy.shortTitle")}</a><a className={kind === "terms" ? "active" : ""} href={`/terms?lang=${locale}`}>{t("legal.terms.shortTitle")}</a><a className={kind === "cookies" ? "active" : ""} href={`/cookie-policy?lang=${locale}`}>{t("legal.cookies.shortTitle")}</a></nav><label className="language"><span className="sr-only">{copy.nav.language}</span><select aria-label={copy.nav.language} value={locale} onChange={(event) => setLocale(event.target.value as SupportedLocale)}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label></div></header><main className="legal-main shell"><a className="legal-back" href={`/?lang=${locale}`}>← {t("legal.back")}</a><article className="legal-document"><div className="legal-title"><img src="/brand/gerofarm-symbol.svg" alt=""/><h1>{title}</h1><p className="legal-updated">{new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date("2026-08-24T12:00:00Z"))}</p><p>{intro}</p><aside>{t(`legal.${kind}.languageNotice`)}</aside></div>{kind === "privacy" && <section className="legal-scope"><h2>{copy.platform.title}</h2><p>{copy.platform.description}</p></section>}{kind === "cookies" && <CookieInventory locale={locale}/>}<div className="legal-sections">{sections.map((section, index) => <section key={section}><h2>{index + 1}. {t(`legal.${kind}.${section}.title`)}</h2><p>{body(section)}</p></section>)}</div></article></main></div>;
}

function CookieInventory({ locale }: { locale: SupportedLocale }) {
  const t = (key: string) => legalMessage(locale, key);
  const rows = [
    ["gero_session", "sessionStorage"], ["gero_csrf", "sessionStorage"], ["gero_farm_organization", "365 d"], ["gerofarm_locale", "localStorage"], ["gerofarm_cookie_consent", "180 d"],
  ];
  return <section className="cookie-inventory"><h2>{t("legal.cookies.currentUse.title")}</h2><p>{t("cookies.category.necessary.description")}</p><div className="cookie-table" role="table">{rows.map(([name, duration]) => <div role="row" key={name}><code role="cell">{name}</code><span role="cell">{duration}</span></div>)}</div><p>{t("cookies.category.analytics.description")}</p><p>{t("cookies.category.marketing.description")}</p></section>;
}
