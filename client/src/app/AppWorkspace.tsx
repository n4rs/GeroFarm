import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import type { HomepageCopy } from "../home-copy";
import { formatWorkspaceMessage, workspaceCopies, workspaceStateCopies } from "./workspace-locales";
import "../mockup/mockup.css";
import "./workspace.css";

type ModuleId = "overview" | "farm" | "operations" | "plans" | "weather" | "harvests" | "notebook" | "resources" | "inventory" | "costs" | "settings";
type NavigationItem = { id: ModuleId; label: string; short: string; group?: string };

const validModules = new Set<ModuleId>(["overview", "farm", "operations", "plans", "weather", "harvests", "notebook", "resources", "inventory", "costs", "settings"]);

function routeModule(pathname = window.location.pathname): ModuleId {
  const candidate = pathname.split("/").filter(Boolean)[1] as ModuleId | undefined;
  return candidate && validModules.has(candidate) ? candidate : "overview";
}

function moduleNavigation(copy: HomepageCopy, common: ReturnType<typeof commonCopy>): NavigationItem[] {
  return [
    { id: "overview", label: common.overview, short: "01" },
    { id: "farm", label: copy.platform.cards[0].title, short: "02" },
    { id: "operations", label: copy.platform.cards[2].title, short: "03" },
    { id: "plans", label: copy.nav.plans, short: "04" },
    { id: "weather", label: copy.nav.weather, short: "05" },
    { id: "harvests", label: copy.platform.cards[5].title, short: "06" },
    { id: "notebook", label: copy.platform.cards[7].title, short: "07" },
    { id: "resources", label: copy.platform.cards[6].title, short: "08", group: copy.modules.kicker },
    { id: "inventory", label: copy.modules.inventory, short: "09" },
    { id: "costs", label: copy.modules.costs, short: "10" },
    { id: "settings", label: common.settings, short: "11" },
  ];
}

function commonCopy() {
  return workspaceCopies["pt-PT"];
}

export default function AppWorkspace() {
  const { session, loading, error, selectOrganization, logout } = useAuth();
  const { locale, copy, setLocale, options } = useI18n();
  const common = workspaceCopies[locale];
  const stateCopy = workspaceStateCopies[locale];
  const navigation = useMemo(() => moduleNavigation(copy, common), [copy, common]);
  const [module, setModule] = useState<ModuleId>(() => routeModule());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  function navigate(next: ModuleId) {
    const path = next === "overview" ? "/app" : `/app/${next}`;
    window.history.pushState(window.history.state, "", `${path}${window.location.search}`);
    setModule(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="farm-app live-workspace">
    <aside className={`farm-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="farm-brand-row"><a href="/" aria-label="GeroFarm"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm" /></a><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label={common.closeNavigation}>×</button></div>
      <div className="farm-context"><span>{common.currentOrganization}</span>{session.organizations.length > 1 ? <select aria-label={common.organization} value={session.selectedOrganizationId} onChange={(event) => void selectOrganization(event.target.value)}>{session.organizations.map(({ organization }) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select> : <strong>{session.access.organization.name}</strong>}</div>
      <nav className="farm-nav" aria-label={common.navigation}>{navigation.map((item, index) => <div key={item.id}>{item.group && <p>{item.group}</p>}<button className={module === item.id ? "active" : ""} onClick={() => navigate(item.id)}><i>{item.short}</i><span>{item.label}</span>{item.id !== "overview" && <em>·</em>}</button>{index === 6 && <div className="nav-divider" />}</div>)}</nav>
      <div className="sidebar-foot"><div className="avatar">{initials}</div><div><b>{session.user.name}</b><span>{common.accountRole}</span></div><button onClick={() => void logout()} aria-label={common.signOut}>↪</button></div>
    </aside>

    <div className="farm-shell">
      <header className="farm-topbar">
        <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label={common.openNavigation}>☰</button>
        <div className="crumb"><span>GeroFarm</span><b>/</b><strong>{active.label}</strong></div>
        <div className="top-actions workspace-actions"><label><span>{common.language}</span><select aria-label={common.language} value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>{options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><button className="icon-button" aria-label={common.search}>⌕</button><button className="icon-button" aria-label={common.notifications}>◎</button><button className="primary-action" onClick={() => navigate("operations")}><span>＋</span> {common.registerOperation}</button></div>
      </header>

      <main className="farm-content">
        {module === "overview" ? <Overview name={session.user.name} organization={session.access.organization.name} common={common} /> : <PendingModule title={active.label} common={common} />}
      </main>
    </div>
  </div>;
}

function Overview({ name, organization, common }: { name: string; organization: string; common: ReturnType<typeof commonCopy> }) {
  return <>
    <section className="page-heading"><div><p>{common.workspace}</p><h1>{formatWorkspaceMessage(common.greeting, { name })}</h1><span>{formatWorkspaceMessage(common.ready, { organization })}</span></div><div className="foundation-links"><a href="/mockup">{common.mockup}</a><a href="/">{common.homepage}</a></div></section>
    <section className="status-grid workspace-status"><div><span>{common.account}</span><b>{common.authenticated}</b></div><div><span>{common.organization}</span><b>{common.selected}</b></div><div><span>{common.access}</span><b>{common.authorized}</b></div></section>
  </>;
}

function PendingModule({ title, common }: { title: string; common: ReturnType<typeof commonCopy> }) {
  return <><section className="page-heading"><div><p>{common.implementation}</p><h1>{title}</h1><span>{common.pendingDescription}</span></div></section><section className="panel empty-detail pending-module"><div className="detail-graphic"><i/><i/><i/></div><div><span>{common.implementation}</span><h3>{common.pending}</h3><p>{common.pendingDescription}</p></div></section></>;
}

export { moduleNavigation, routeModule };
