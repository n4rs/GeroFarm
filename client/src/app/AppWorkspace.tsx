import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import type { HomepageCopy } from "../home-copy";
import { workspaceCopies, workspaceStateCopies } from "./workspace-locales";
import { irrigationCopies } from "./operations/irrigation-locales";
import { agronomyCopies } from "./agronomy/agronomy-locales";
import EntitlementCenter from "./entitlements/EntitlementCenter";
import { settingsCopies } from "./settings/settings-locales";
import type { SupportedLocale } from "../home-copy";
import { isRouteVisible, pathForModule, routeManifest, routeModule, type ModuleId, type NavigationGroupId } from "../routing/route-manifest";
import GeroAppShell from "../shell/GeroAppShell";
import { navigationGroupCopies } from "../shell/navigation-locales";
import OverviewDashboard from "./OverviewDashboard";
import "./legacy-patterns.css";
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

type NavigationItem = { id: ModuleId; label: string; group: NavigationGroupId };

function moduleNavigation(copy: HomepageCopy, common: ReturnType<typeof commonCopy>, privacyLabel: string, irrigationLabel: string, monitoringLabel:string, harvestLabel:string, notebookLabel:string): NavigationItem[] {
  const labels: Record<ModuleId, string> = {
    overview: common.overview,
    farm: copy.platform.cards[0].title,
    crops: copy.platform.cards[1].title,
    operations: copy.platform.cards[2].title,
    monitoring: monitoringLabel,
    irrigation: irrigationLabel,
    plans: copy.nav.plans,
    weather: copy.nav.weather,
    harvests: harvestLabel,
    notebook: notebookLabel,
    resources: copy.platform.cards[6].title,
    inventory: copy.modules.inventory,
    costs: copy.modules.costs,
    privacy: privacyLabel,
    settings: common.settings,
  };
  return routeManifest.map((route) => ({ id: route.id, label: labels[route.id], group: route.group }));
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
  const canRegister=session.access.access.writeAllowed&&(permitted("operations.manage")||permitted("operations.create"));
  const visibleNavigation=navigation.filter(item=>isRouteVisible(routeManifest.find(route=>route.id===item.id)!,features));
  const navigationLabels=Object.fromEntries(navigation.map(item=>[item.id,item.label])) as Record<ModuleId,string>;

  function navigate(next: ModuleId) {
    const path = pathForModule(next);
    const search=new URLSearchParams(window.location.search);for(const key of ["action","fieldId","plantationId","operationType"])search.delete(key);
    window.history.pushState(window.history.state, "", `${path}${search.size?`?${search}`:""}`);
    setModule(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function registerOperation(){
    const search=new URLSearchParams(window.location.search);search.set("action","register-operation");
    window.history.pushState(window.history.state,"",`/app/operations?${search}`);setModule("operations");setSidebarOpen(false);window.scrollTo({top:0,behavior:"smooth"});
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("gerofarm:register-operation")), 0);
  }

  async function changeCentralLocale(next: SupportedLocale) {
    setLocaleUpdate("saving");
    try {
      await updateLocale(next);
      setLocale(next);
      setLocaleUpdate("idle");
    } catch { setLocaleUpdate("error"); }
  }

  const organizationControl = session.organizations.length > 1 ? <select aria-label={common.organization} value={session.selectedOrganizationId} onChange={(event) => void selectOrganization(event.target.value)}>{session.organizations.map(({ organization }) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select> : undefined;
  const settingsCopy = settingsCopies[locale];
  const accountLinks = config ? [{ label: settingsCopy.manageProfile, href: config.accountUrl }, { label: settingsCopy.openAdministration, href: config.administrationUrl }] : [];
  const appLinks = config ? [{ label: settingsCopy.modules, href: config.applicationSelectorUrl }] : [];
  return <GeroAppShell
    navigation={visibleNavigation}
    groupLabels={navigationGroupCopies[locale]}
    activeId={module}
    activeLabel={active.label}
    onNavigate={navigate}
    navigationLabel={common.navigation}
    openNavigationLabel={common.openNavigation}
    closeNavigationLabel={common.closeNavigation}
    mobileNavigationOpen={sidebarOpen}
    onMobileNavigationChange={setSidebarOpen}
    organizationLabel={common.currentOrganization}
    organizationName={session.access.organization.name}
    organizationControl={organizationControl}
    languageControl={<select className="gero-shell-language" aria-label={common.language} value={locale} disabled={localeUpdate === "saving"} onChange={(event) => void changeCentralLocale(event.target.value as SupportedLocale)}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select>}
    registerLabel={common.registerOperation}
    canRegister={canRegister}
    onRegister={registerOperation}
    userName={session.user.name}
    userRole={common.accountRole}
    initials={initials}
    accountLinks={accountLinks}
    appLinks={appLinks}
    signOutLabel={common.signOut}
    onSignOut={() => void logout()}
  >
      <div className="farm-app live-workspace" data-write-allowed={session.access.access.writeAllowed}>
        <EntitlementCenter config={config}/>
        {localeUpdate === "error" && <div className="workspace-locale-error" role="alert">{settingsCopies[locale].saveError}</div>}
        {module === "overview" ? <OverviewDashboard name={session.user.name} organization={session.access.organization.name} common={common} locale={locale} navigationLabels={navigationLabels} actionDescriptions={{ farm: copy.platform.cards[0].description, operations: copy.platform.cards[2].description, monitoring: copy.weather.description, notebook: copy.platform.cards[7].description }} canRegister={canRegister} onRegister={registerOperation} onNavigate={navigate} /> : module === "farm" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><FarmHoldingsModule /></Suspense> : module === "crops" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><CropsModule /></Suspense> : module === "resources" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><ResourcesModule /></Suspense> : module === "operations" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><OperationsModule /></Suspense> : module === "monitoring" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="monitoring" /></Suspense> : module === "harvests" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="harvests" /></Suspense> : module === "notebook" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><AgronomyModule view="notebook" /></Suspense> : module === "irrigation" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><IrrigationModule /></Suspense> : module === "plans" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><PlansModule /></Suspense> : module === "weather" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><WeatherModule /></Suspense> : module === "privacy" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><PrivacyModule /></Suspense> : module === "inventory" || module === "costs" ? <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><EconomicsModule view={module} /></Suspense> : <Suspense fallback={<div className="module-state"><span className="spinner" /></div>}><SettingsModule /></Suspense>}
      </div>
  </GeroAppShell>;
}

export { moduleNavigation, routeModule };
