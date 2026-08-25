import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { Button, PageHeader } from "../../design-system";
import { useI18n } from "../../i18n";
import { normalizeLocale } from "../../i18n";
import type { SupportedLocale } from "../../home-copy";
import { entitlementCopies } from "../entitlements/entitlement-locales";
import { formatWorkspaceMessage, workspaceCopies } from "../workspace-locales";
import { entitlementValueEnabled, settingsCoreLinks } from "./settings-links";
import { settingsCopies, settingsMessage } from "./settings-locales";
import "./settings.css";

export default function SettingsModule() {
  const { session, config, updateLocale } = useAuth();
  const { locale, copy, options, setLocale } = useI18n();
  const t = settingsCopies[locale], common = workspaceCopies[locale], entitlement = entitlementCopies[locale];
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(locale);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const links = useMemo(() => settingsCoreLinks(config), [config]);

  useEffect(() => setSelectedLocale(locale), [locale]);
  if (!session) return null;

  const access = session.access;
  const subscription = access.subscription;
  const featureRows = [
    { key: "agronomicWeather", fallback: "weather", label: copy.nav.weather },
    { key: "inventory", label: copy.modules.inventory },
    { key: "costs", label: copy.modules.costs },
    { key: "privacyByDesign", label: copy.privacy.kicker },
    { key: "fieldNotebookExport", label: copy.platform.cards[7].title },
  ].map(({ key, fallback, label }) => ({ key, label, value: access.entitlements.features[key] ?? (fallback ? access.entitlements.features[fallback] : undefined) }));
  const limitLabels: Record<string, string> = {
    applicationUsers: entitlement.applicationUsers, activeAreaHectares: entitlement.activeAreaHectares,
    activePlots: entitlement.activePlots, activePlantations: entitlement.activePlantations,
    virtualStations: entitlement.virtualStations,
  };
  const centralLocale = normalizeLocale(session.user.preferredLocale);
  const link = (href: string | null, label: string) => href ? <a className="settings-core-link" href={href} target="_blank" rel="noreferrer"><span>{label}</span><small>{t.opensCore} ↗</small></a> : null;
  const status = (value: string) => value === "active" ? t.active : value === "inactive" ? t.inactive : value;
  const accessMode = access.access.mode === "full" ? t.full : access.access.mode === "read_only" ? t.readOnly : t.denied;

  async function saveLanguage() {
    if (selectedLocale === centralLocale) { setLocale(selectedLocale); setSaveState("saved"); return; }
    setSaveState("saving");
    try {
      await updateLocale(selectedLocale);
      setLocale(selectedLocale);
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }

  return <div className="settings-module">
    <PageHeader className="page-heading settings-heading" eyebrow={<p>Gero Core</p>} title={common.settings} description={t.subtitle} />
    <div className="settings-source-note"><strong>Gero Core</strong><span>{t.centralNotice}</span></div>

    <section className="settings-grid">
      <article className="settings-card">
        <header><span>01</span><div><small>{common.account}</small><h2>{session.user.name}</h2></div></header>
        <dl><div><dt>{t.name}</dt><dd>{session.user.name}</dd></div><div><dt>{t.email}</dt><dd>{session.user.email}</dd></div><div><dt>{t.status}</dt><dd>{status(session.user.status)}</dd></div></dl>
        <footer>{link(links.profile, t.manageProfile)}{link(links.security, t.manageSecurity)}</footer>
      </article>

      <article className="settings-card">
        <header><span>02</span><div><small>{common.organization}</small><h2>{access.organization.name}</h2></div></header>
        <dl><div><dt>{t.membership}</dt><dd><code>{access.membership.role}</code></dd></div><div><dt>{t.status}</dt><dd>{status(access.membership.status)}</dd></div><div><dt>{t.profile}</dt><dd><code>{access.applicationMembership.profile}</code></dd></div></dl>
        <footer>{link(links.organizations, t.manageOrganization)}{link(links.administration, t.openAdministration)}</footer>
      </article>

      <article className="settings-card settings-access-card">
        <header><span>03</span><div><small>{common.access}</small><h2>{accessMode}</h2></div></header>
        <div className="settings-access-flags"><div><span>{t.write}</span><b className={access.access.writeAllowed ? "on" : "off"}>{access.access.writeAllowed ? t.enabled : t.notEnabled}</b></div><div><span>{t.export}</span><b className={access.access.exportAllowed ? "on" : "off"}>{access.access.exportAllowed ? t.enabled : t.notEnabled}</b></div><div><span>{access.applicationMembership.temporary ? t.temporary : t.permanent}</span><b>{access.applicationMembership.expiresAt ? settingsMessage(t.expires, { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(access.applicationMembership.expiresAt)) }) : t.none}</b></div></div>
        <details><summary>{t.permissions} · {new Intl.NumberFormat(locale).format(access.applicationMembership.permissions.length)}</summary><ul>{access.applicationMembership.permissions.length ? access.applicationMembership.permissions.map((permission) => <li key={permission}><code>{permission}</code></li>) : <li>{t.none}</li>}</ul></details>
      </article>

      <article className="settings-card settings-plan-card">
        <header><span>04</span><div><small>{t.subscription}</small><h2>{subscription?.plan.name ?? t.noSubscription}</h2></div></header>
        <dl><div><dt>{entitlement.plan}</dt><dd>{subscription?.plan.name ?? "—"}</dd></div><div><dt>{t.status}</dt><dd>{subscription ? status(subscription.status) : t.none}</dd></div></dl>
        <h3>{t.modules}</h3><div className="settings-modules">{featureRows.map((feature) => <div key={feature.key}><span>{feature.label}</span><b className={entitlementValueEnabled(feature.value) ? "on" : "off"}>{entitlementValueEnabled(feature.value) ? t.enabled : t.notEnabled}</b></div>)}</div>
        <details><summary>{t.limits}</summary><ul>{Object.entries(access.entitlements.limits).length ? Object.entries(access.entitlements.limits).map(([key, value]) => <li key={key}><span>{limitLabels[key] ?? key}</span><b>{value === null ? entitlement.unlimited : String(value)}</b></li>) : <li>{t.none}</li>}</ul></details>
        <details><summary>{entitlement.addons}</summary><ul>{access.entitlements.addons.length ? access.entitlements.addons.map((addon) => <li key={addon.code}><code>{addon.code}</code><b>×{addon.quantity}</b></li>) : <li>{t.none}</li>}</ul></details>
        <footer>{link(links.account, entitlement.managePlan)}</footer>
      </article>
    </section>

    <section className="settings-language-card">
      <div><small>{common.language}</small><h2>{options.find((option) => option.code === centralLocale)?.label ?? options.find((option) => option.code === locale)?.label}</h2><p>{t.languageDescription}</p></div>
      <div className="settings-language-control"><label><span>{common.language}</span><select value={selectedLocale} onChange={(event) => { setSelectedLocale(event.target.value as SupportedLocale); setSaveState("idle"); }}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><Button className="primary-action" loading={saveState === "saving"} loadingLabel={t.saving} onClick={() => void saveLanguage()}>{t.saveLanguage}</Button>{saveState === "saved" && <p className="settings-success" role="status">{t.saved}</p>}{saveState === "error" && <p className="form-error" role="alert">{t.saveError}</p>}</div>
    </section>
  </div>;
}
