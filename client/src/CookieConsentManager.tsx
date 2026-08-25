import { useEffect, useState } from "react";
import { COOKIE_PREFERENCES_EVENT, globalPrivacyControlEnabled, readCookieConsent, saveCookieConsent, type CookieConsentRecord } from "./cookie-consent";
import { cookieMessage } from "./cookie-messages";
import { useI18n } from "./i18n";
import { AccessibleDialog } from "./components/AccessibleDialog";

type Choices = Pick<CookieConsentRecord, "preferences" | "analytics" | "marketing">;
const essentialOnly: Choices = { preferences: false, analytics: false, marketing: false };
const all: Choices = { preferences: true, analytics: true, marketing: true };

export default function CookieConsentManager() {
  const { locale } = useI18n(); const t = (key: string) => cookieMessage(locale, key);
  const [consent, setConsent] = useState(() => readCookieConsent());
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Choices>(() => consent || essentialOnly);
  const gpc = globalPrivacyControlEnabled();
  useEffect(() => { const show = () => { const current = readCookieConsent(); setChoices(current || essentialOnly); setOpen(true); }; window.addEventListener(COOKIE_PREFERENCES_EVENT, show); return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, show); }, []);
  const apply = (next: Choices, source: "banner" | "preferences") => { const saved = saveCookieConsent(next, source); setConsent(saved); setChoices(saved); setOpen(false); };
  const policyHref = `/cookie-policy?lang=${locale}`;
  return <>
    {!consent && <section className="cookie-banner" aria-live="polite" aria-label={t("cookies.banner.title")}><div><b>{t("cookies.banner.title")}</b><p>{t("cookies.banner.description")} <a href={policyHref}>{t("cookies.policyLink")}</a></p>{gpc && <small>{t("cookies.gpcDetected")}</small>}</div><div className="cookie-actions"><button className="button outline" onClick={() => apply(essentialOnly, "banner")}>{t("cookies.rejectOptional")}</button><button className="button ghost" onClick={() => setOpen(true)}>{t("cookies.customize")}</button><button className="button" onClick={() => apply(all, "banner")}>{t("cookies.acceptAll")}</button></div></section>}
    {open && <AccessibleDialog labelledBy="cookie-title" onClose={() => setOpen(false)} backdropClassName="cookie-overlay" className="cookie-dialog"><button type="button" data-dialog-close className="cookie-close" aria-label={t("cookies.manage")} onClick={() => setOpen(false)}>×</button><h2 id="cookie-title">{t("cookies.preferences.title")}</h2><p>{t("cookies.preferences.description")}</p>{gpc && <aside>{t("cookies.gpcExplanation")}</aside>}<div className="cookie-categories"><Category title={t("cookies.category.necessary.title")} description={t("cookies.category.necessary.description")} checked disabled badge={t("cookies.alwaysActive")}/><Category title={t("cookies.category.preferences.title")} description={t("cookies.currentlyInactive")} checked={choices.preferences} onChange={(preferences) => setChoices({ ...choices, preferences })} badge={t("cookies.currentlyInactive")}/><Category title={t("cookies.category.analytics.title")} description={t("cookies.category.analytics.description")} checked={choices.analytics} onChange={(analytics) => setChoices({ ...choices, analytics })} badge={t("cookies.currentlyInactive")}/><Category title={t("cookies.category.marketing.title")} description={t("cookies.category.marketing.description")} checked={choices.marketing} disabled={gpc} onChange={(marketing) => setChoices({ ...choices, marketing })} badge={t("cookies.currentlyInactive")}/></div><a href={policyHref}>{t("cookies.policyLink")}</a><div className="cookie-actions"><button type="button" className="button outline" onClick={() => apply(essentialOnly, "preferences")}>{t("cookies.rejectOptional")}</button><button type="button" className="button ghost" onClick={() => apply(all, "preferences")}>{t("cookies.acceptAll")}</button><button type="button" className="button" onClick={() => apply(choices, "preferences")}>{t("cookies.save")}</button></div></AccessibleDialog>}
  </>;
}

function Category({ title, description, checked, disabled, onChange, badge }: { title: string; description: string; checked: boolean; disabled?: boolean; onChange?: (value: boolean) => void; badge?: string }) {
  return <label className="cookie-category"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)}/><span><b>{title}</b>{badge && <small>{badge}</small>}<p>{description}</p></span></label>;
}
