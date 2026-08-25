import type { ReactNode } from "react";
import {
  AppSwitcher,
  Breadcrumb,
  Button,
  Drawer,
  IconButton,
  MenuLink,
  Sidebar,
  Topbar,
  UserMenu,
} from "../design-system";
import type { ModuleId, NavigationGroupId } from "../routing/route-manifest";
import "./shell.css";

export type ShellNavigationItem = { id: ModuleId; label: string; group: NavigationGroupId };

type ShellLink = { label: string; href: string };

type GeroAppShellProps = {
  children: ReactNode;
  navigation: ShellNavigationItem[];
  groupLabels: Record<NavigationGroupId, string>;
  activeId: ModuleId;
  activeLabel: string;
  onNavigate: (module: ModuleId) => void;
  navigationLabel: string;
  openNavigationLabel: string;
  closeNavigationLabel: string;
  mobileNavigationOpen: boolean;
  onMobileNavigationChange: (open: boolean) => void;
  organizationLabel: string;
  organizationName: string;
  organizationControl?: ReactNode;
  languageControl: ReactNode;
  registerLabel: string;
  canRegister: boolean;
  onRegister: () => void;
  userName: string;
  userRole: string;
  initials: string;
  accountLinks: ShellLink[];
  appLinks: ShellLink[];
  signOutLabel: string;
  onSignOut: () => void;
};

function MenuGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function PlusGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function NavigationList({ items, groupLabels, activeId, navigationLabel, onNavigate }: { items: ShellNavigationItem[]; groupLabels: Record<NavigationGroupId, string>; activeId: ModuleId; navigationLabel: string; onNavigate: (module: ModuleId) => void }) {
  const groups = (["overview", "operation", "analysis", "management", "settings"] as const)
    .map((id) => ({ id, items: items.filter((item) => item.group === id) }))
    .filter((group) => group.items.length);
  return <nav className="gero-shell-nav" aria-label={navigationLabel}>
    {groups.map((group) => <section className="gero-shell-nav__group" key={group.id} aria-labelledby={`nav-group-${group.id}`}>
      <h2 id={`nav-group-${group.id}`}>{groupLabels[group.id]}</h2>
      <ul>{group.items.map((item) => <li key={item.id}><button type="button" className={item.id === activeId ? "is-active" : undefined} aria-current={item.id === activeId ? "page" : undefined} onClick={() => onNavigate(item.id)}><span aria-hidden="true" />{item.label}</button></li>)}</ul>
    </section>)}
  </nav>;
}

function BrandAndApplications({ appLinks }: { appLinks: ShellLink[] }) {
  return <div className="gero-shell-brand">
    <a href="/app" aria-label="GeroFarm"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm" /></a>
    <AppSwitcher label="Gero" icon={<img src="/brand/gerofarm-symbol.svg" alt="" />}>
      {appLinks.map((link) => <MenuLink href={link.href} key={link.href}>{link.label}</MenuLink>)}
    </AppSwitcher>
  </div>;
}

export default function GeroAppShell(props: GeroAppShellProps) {
  const navigation = <NavigationList items={props.navigation} groupLabels={props.groupLabels} activeId={props.activeId} navigationLabel={props.navigationLabel} onNavigate={props.onNavigate} />;
  const context = <div className="gero-shell-context"><span>{props.organizationLabel}</span>{props.organizationControl ?? <strong>{props.organizationName}</strong>}</div>;
  return <div className="gero-ds-root gero-app-layout">
    <Sidebar className="gero-shell-sidebar">
      <BrandAndApplications appLinks={props.appLinks} />
      {context}
      {navigation}
    </Sidebar>

    <Drawer open={props.mobileNavigationOpen} onClose={() => props.onMobileNavigationChange(false)} labelledBy="gero-mobile-navigation-title">
      <header className="gero-mobile-drawer__header"><h2 id="gero-mobile-navigation-title">GeroFarm</h2><IconButton label={props.closeNavigationLabel} onClick={() => props.onMobileNavigationChange(false)}>×</IconButton></header>
      <BrandAndApplications appLinks={props.appLinks} />
      {context}
      {navigation}
    </Drawer>

    <div className="gero-shell-main">
      <Topbar
        start={<><IconButton className="gero-shell-menu-button" label={props.openNavigationLabel} onClick={() => props.onMobileNavigationChange(true)}><MenuGlyph /></IconButton><Breadcrumb ariaLabel={props.navigationLabel} items={[{ label: "GeroFarm", onClick: () => props.onNavigate("overview") }, { label: props.activeLabel }]} /></>}
        center={<span className="gero-shell-organization" title={props.organizationName}>{props.organizationName}</span>}
        end={<div className="gero-shell-actions">{props.languageControl}<Button className="gero-shell-register" disabled={!props.canRegister} onClick={props.onRegister}><PlusGlyph />{props.registerLabel}</Button><UserMenu label={props.userName} avatar={<span className="gero-shell-avatar" aria-hidden="true">{props.initials}</span>}><span className="gero-shell-user-role">{props.userRole}</span>{props.accountLinks.map((link) => <MenuLink href={link.href} key={link.href}>{link.label}</MenuLink>)}<button type="button" role="menuitem" className="gero-dropdown__item" onClick={props.onSignOut}>{props.signOutLabel}</button></UserMenu></div>}
      />
      <div className="gero-shell-mobile-context"><span>{props.organizationLabel}</span><strong>{props.organizationName}</strong></div>
      <main className="gero-shell-content" id="main-content">{props.children}</main>
      <IconButton className="gero-shell-mobile-register" label={props.registerLabel} disabled={!props.canRegister} onClick={props.onRegister}><PlusGlyph /></IconButton>
    </div>
  </div>;
}
