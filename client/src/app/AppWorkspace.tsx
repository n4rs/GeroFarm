import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import type { HomepageCopy } from "../home-copy";
import { formatWorkspaceMessage, workspaceCopies, workspaceStateCopies } from "./workspace-locales";
import { irrigationCopies } from "./operations/irrigation-locales";
import { agronomyCopies } from "./agronomy/agronomy-locales";
import EntitlementCenter from "./entitlements/EntitlementCenter";
import { settingsCopies } from "./settings/settings-locales";
import type { SupportedLocale } from "../home-copy";
import type { FarmHoldingDto } from "@shared/farm-holdings";
import { farmHoldingCopies } from "./farm/farm-holding-locales";
import "../mockup/mockup.css";
import "./workspace.css";

const FarmHoldingsModule = lazy(() => import("./farm/FarmHoldingsModule"));
const CropsModule = lazy(() => import("./crops/CropsModule"));
const ResourcesModule = lazy(() => import("./resources/ResourcesModule"));
const OperationsModule = lazy(() => import("./operations/OperationsModule"));
const IrrigationModule = lazy(() => import("./operations/IrrigationModule"));
const PlansModule = lazy(() => import("./plans/PlansModule"));
const PrivacyModule = lazy(() => import("./privacy/PrivacyModule"));
const AgronomyModule = lazy(() => import("./agronomy/AgronomyModule"));
const EconomicsModule = lazy(() => import("./economics/EconomicsModule"));
const WeatherModule = lazy(() => import("./weather/WeatherModule"));
const SettingsModule = lazy(() => import("./settings/SettingsModule"));

type ModuleId = "overview" | "farm" | "crops" | "operations" | "monitoring" | "irrigation" | "plans" | "weather" | "harvests" | "notebook" | "resources" | "inventory" | "costs" | "privacy" | "settings";
type NavigationItem = { id: ModuleId; label: string; short: string; group?: string };

const validModules = new Set<ModuleId>(["overview", "farm", "crops", "operations", "monitoring", "irrigation", "plans", "weather", "harvests", "notebook", "resources", "inventory", "costs", "privacy", "settings"]);

function routeModule(pathname = window.location.pathname): ModuleId {
  const candidate = pathname.split("/").filter(Boolean)[1] as ModuleId | undefined;
  return candidate && validModules.has(candidate) ? candidate : "overview";
}

function moduleNavigation(copy: HomepageCopy, common: ReturnType<typeof commonCopy>, privacyLabel = "Privacy by Design", irrigationLabel = "Irrigation", monitoringLabel="Monitoring", harvestLabel?:string, notebookLabel?:string): NavigationItem[] {
  return [
    { id: "overview", label: common.overview, short: "01" },
    { id: "farm", label: copy.platform.cards[0].title, short: "02" },
    { id: "crops", label: copy.platform.cards[1].title, short: "03" },
    { id: "operations", label: copy.platform.cards[2].title, short: "04" },
    { id: "monitoring", label: monitoringLabel, short: "05" },
    { id: "irrigation", label: irrigationLabel, short: "06" },
    { id: "plans", label: copy.nav.plans, short: "06" },
    { id: "weather", label: copy.nav.weather, short: "06" },
    { id: "harvests", label: harvestLabel||copy.platform.cards[5].title, short: "07" },
    { id: "notebook", label: notebookLabel||copy.platform.cards[7].title, short: "08" },
    { id: "resources", label: copy.platform.cards[6].title, short: "09", group: copy.modules.kicker },
    { id: "inventory", label: copy.modules.inventory, short: "10" },
    { id: "costs", label: copy.modules.costs, short: "11" },
    { id: "privacy", label: privacyLabel, short: "12" },
    { id: "settings", label: common.settings, short: "13" },
  ];
}

function commonCopy() {
  return workspaceCopies["pt-PT"];
}

export default function AppWorkspace() {
  const { session, config, loading, error, selectOrganization, updateLocale, logout } = useAuth();
  const { locale, copy, setLocale, options } = useI18n();
  const common = workspaceCopies[locale];
  const stateCopy = workspaceStateCopies[locale];
  const navigation = useMemo(() => moduleNavigation(copy, common, copy.privacy.title, irrigationCopies[locale].irrigations,agronomyCopies[locale].monitoring,agronomyCopies[locale].harvests,agronomyCopies[locale].currentNotebook), [copy, common, locale]);
  const [module, setModule] = useState<ModuleId>(() => routeModule());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localeUpdate, setLocaleUpdate] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => {
    const onPopState = () => setModule(routeModule());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (loading) return <main className="state"><div className="spinner" aria-label={stateCopy.loading} /></main>;
  if (error || !session) return <main className="state"><div className="card"><h1>{stateCopy.unavailable}</h1><p>{stateCopy.retry}</p><a className="button" href="/">{common.homepage}</a></div></main>;
  if (!session.access.access.allowed) return <main className="state"><div className="card"><h1>GeroFarm</h1><p>{stateCopy.denied}</p><a className="button" href="/#plans">{copy.nav.plans}</a></div></main>;

  const active = navigation.find((item) => item.id === module) || navigation[0];
  const initials = session.user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const features=session.access.entitlements.features,permissions=session.access.applicationMembership.permissions,permitted=(value:string)=>permissions.includes("*")||permissions.includes(value);
  const visibleNavigation=navigation.filter(item=>item.id==="inventory"?features.inventory===true:item.id==="costs"?features.costs===true:item.id==="privacy"?features.privacyByDesign===true:item.id==="weather"?features.weather===true||typeof features.agronomicWeather==="string":true);

  function navigate(next: ModuleId) {
    const path = next === "overview" ? "/app" : `/app/${next}`;
    window.history.pushState(window.history.state, "", `${path}${window.location.search}`);
    setModule(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeCentralLocale(next: SupportedLocale) {
    setLocaleUpdate("saving");
    try {
      await updateLocale(next);
      setLocale(next);
      setLocaleUpdate("idle");
    } catch { setLocaleUpdate("error"); }
  }

  return <div className="farm-app live-workspace">
    <aside className={`farm-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="farm-brand-row"><a href="/" aria-label="GeroFarm"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm" /></a><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label={common.closeNavigation}>×</button></div>
      <div className="farm-context"><span>{common.currentOrganization}</span>{session.organizations.length > 1 ? <select aria-label={common.organization} value={session.selectedOrganizationId} onChange={(event) => void selectOrganization(event.target.value)}>{session.organizations.map(({ organization }) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select> : <strong>{session.access.organization.name}</strong>}</div>
      <nav className="farm-nav" aria-label={common.navigation}>{visibleNavigation.map((item, index) => <div key={item.id}>{item.group && <p>{item.group}</p>}<button className={module === item.id ? "active" : ""} onClick={() => navigate(item.id)}><i>{item.short}</i><span>{item.label}</span>{item.id !== "overview" && <em>·</em>}</button>{index === 6 && <div className="nav-divider" />}</div>)}</nav>
      <div className="sidebar-foot"><div className="avatar">{initials}</div><div><b>{session.user.name}</b><span>{common.accountRole}</span></div><button onClick={() => void logout()} aria-label={common.signOut}>↪</button></div>
    </aside>

    <div className="farm-shell">
      <header className="farm-topbar">
        <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label={common.openNavigation}>☰</button>
        <div className="crumb"><span>GeroFarm</span><b>/</b><strong>{active.label}</strong></div>
        <div className="top-actions workspace-actions"><label><span>{common.language}</span><select aria-label={common.language} value={locale} disabled={localeUpdate === "saving"} onChange={(event) => void changeCentralLocale(event.target.value as SupportedLocale)}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><button className="primary-action" disabled={!session.access.access.writeAllowed||(!permitted("operations.manage")&&!permitted("operations.create"))} onClick={() => navigate("operations")}><span>＋</span> {common.registerOperation}</button></div>
      </header>

      <main className="farm-content">
        <EntitlementCenter config={config}/>
        {localeUpdate === "error" && <div className="workspace-locale-error" role="alert">{settingsCopies[locale].saveError}</div>}
        {module === "overview" ? <Overview name={session.user.name} organization={session.access.organization.name} common={common} locale={locale} onOpenFarm={() => navigate("farm")} /> : module === "farm" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><FarmHoldingsModule /></Suspense> : module === "crops" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><CropsModule /></Suspense> : module === "resources" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><ResourcesModule /></Suspense> : module === "operations" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><OperationsModule /></Suspense> : module === "monitoring" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="monitoring" /></Suspense> : module === "harvests" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="harvests" /></Suspense> : module === "notebook" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="notebook" /></Suspense> : module === "irrigation" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><IrrigationModule /></Suspense> : module === "plans" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><PlansModule /></Suspense> : module === "weather" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><WeatherModule /></Suspense> : module === "privacy" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><PrivacyModule /></Suspense> : module === "inventory" || module === "costs" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><EconomicsModule view={module} /></Suspense> : <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><SettingsModule /></Suspense>}
      </main>
    </div>
  </div>;
}

function Overview({ name, organization, common, locale, onOpenFarm }: { name: string; organization: string; common: ReturnType<typeof commonCopy>; locale: SupportedLocale; onOpenFarm: () => void }) {
  const [holdingState, setHoldingState] = useState<"loading" | "missing" | "ready" | "error">("loading");
  useEffect(() => { let active = true; void fetch("/api/farm/holdings", { credentials: "include" }).then(async response => { if (!response.ok) throw new Error(); const holdings = ((await response.json()) as { data: FarmHoldingDto[] }).data; if (active) setHoldingState(holdings.length ? "ready" : "missing"); }).catch(() => { if (active) setHoldingState("error"); }); return () => { active = false; }; }, []);
  const holdingCopy = farmHoldingCopies[locale];
  return <>
    <section className="page-heading"><div><p>{common.workspace}</p><h1>{formatWorkspaceMessage(common.greeting, { name })}</h1><span>{formatWorkspaceMessage(common.ready, { organization })}</span></div><div className="foundation-links"><a href="/">{common.homepage}</a></div></section>
    <section className="status-grid workspace-status"><div><span>{common.account}</span><b>{common.authenticated}</b></div><div><span>{common.organization}</span><b>{common.selected}</b></div><div><span>{common.access}</span><b>{common.authorized}</b></div></section>
    {holdingState === "missing" && <section className="panel setup-assistant"><div><p>{holdingCopy.kicker}</p><h2>{holdingCopy.title}</h2><span>{holdingCopy.empty}</span></div><button className="primary-action" onClick={onOpenFarm}>＋ {holdingCopy.add}</button></section>}
    {holdingState === "error" && <section className="panel setup-assistant error-state"><p>{holdingCopy.loadError}</p><button className="subtle-button" onClick={onOpenFarm}>{holdingCopy.edit}</button></section>}
  </>;
}

export { moduleNavigation, routeModule };
