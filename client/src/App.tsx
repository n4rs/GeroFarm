import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, redirectToAccount, useAuth } from "./auth";
import { reservedApplicationHandoff } from "./core-navigation";
import MarketingHome from "./MarketingHome";
import { detectLocale, I18nProvider } from "./i18n";
import { workspaceStateCopies } from "./app/workspace-locales";
import CookieConsentManager from "./CookieConsentManager";
import { legalDocumentKind } from "./legal-routes";

const LegalDocumentPage = lazy(() => import("./LegalDocumentPage"));
const AppWorkspace = lazy(() => import("./app/AppWorkspace"));
const AgronomyModule = lazy(() => import("./app/agronomy/AgronomyModule"));

function AccountRedirect({ destination }: { destination: "loginUrl" | "registerUrl" }) {
  useEffect(() => { void redirectToAccount(destination); }, [destination]);
  return <Loading />;
}

function Loading() {
  return <main className="state"><div className="spinner" aria-label={workspaceStateCopies[detectLocale()].loading} /></main>;
}

function PublicPage({ legalKind }: { legalKind: ReturnType<typeof legalDocumentKind> }) { return <I18nProvider><>{legalKind ? <Suspense fallback={<Loading/>}><LegalDocumentPage kind={legalKind}/></Suspense> : <MarketingHome/>}<CookieConsentManager/></></I18nProvider>; }

function Workspace() { const { session } = useAuth(); return <I18nProvider preferredLocale={session?.user.preferredLocale}><Suspense fallback={<Loading/>}><AppWorkspace /></Suspense></I18nProvider>; }

export default function App() {
  const path = window.location.pathname;
  const handoff = reservedApplicationHandoff(window.location.href);
  if (handoff) return <CoreHandoff destination={handoff} />;
  if (path === "/mockup" || path.startsWith("/mockup/")) return <ApplicationRedirect />;
  if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV && path.startsWith("/__visual-review/agronomy/")) { const view=path.endsWith("/harvests")?"harvests":path.endsWith("/notebook")?"notebook":"monitoring";return <I18nProvider><main className="farm-app"><div className="module-stage"><Suspense fallback={<Loading/>}><AgronomyModule view={view}/></Suspense></div></main></I18nProvider>; }
  if (path === "/login") return <AccountRedirect destination="loginUrl" />;
  if (path === "/register") return <AccountRedirect destination="registerUrl" />;
  if (path === "/app" || path.startsWith("/app/")) return <AuthProvider><Workspace /></AuthProvider>;
  return <PublicPage legalKind={legalDocumentKind(path)} />;
}

function ApplicationRedirect() {
  useEffect(() => { window.location.replace("/app"); }, []);
  return <Loading />;
}

function CoreHandoff({ destination }: { destination: string }) {
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <Loading />;
}
