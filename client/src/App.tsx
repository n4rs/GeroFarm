import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, redirectToAccount, useAuth } from "./auth";
import { reservedApplicationHandoff } from "./core-navigation";
import MarketingHome from "./MarketingHome";
import { I18nProvider } from "./i18n";
import CookieConsentManager from "./CookieConsentManager";
import { legalDocumentKind } from "./legal-routes";

const LegalDocumentPage = lazy(() => import("./LegalDocumentPage"));
const MockupWorkspace = lazy(() => import("./mockup/MockupWorkspace"));
const AppWorkspace = lazy(() => import("./app/AppWorkspace"));

function AccountRedirect({ destination }: { destination: "loginUrl" | "registerUrl" }) {
  useEffect(() => { void redirectToAccount(destination); }, [destination]);
  return <Loading />;
}

function Loading() {
  return <main className="state"><div className="spinner" aria-label="A carregar" /></main>;
}

function PublicPage({ legalKind }: { legalKind: ReturnType<typeof legalDocumentKind> }) { return <I18nProvider><>{legalKind ? <Suspense fallback={<Loading/>}><LegalDocumentPage kind={legalKind}/></Suspense> : <MarketingHome/>}<CookieConsentManager/></></I18nProvider>; }

function Workspace() { const { session } = useAuth(); return <I18nProvider preferredLocale={session?.user.preferredLocale}><Suspense fallback={<Loading/>}><AppWorkspace /></Suspense></I18nProvider>; }

export default function App() {
  const path = window.location.pathname;
  const handoff = reservedApplicationHandoff(window.location.href);
  if (handoff) return <CoreHandoff destination={handoff} />;
  if (path === "/mockup" || path.startsWith("/mockup/")) return <Suspense fallback={<Loading/>}><MockupWorkspace /></Suspense>;
  if (path === "/login") return <AccountRedirect destination="loginUrl" />;
  if (path === "/register") return <AccountRedirect destination="registerUrl" />;
  if (path === "/app" || path.startsWith("/app/")) return <AuthProvider><Workspace /></AuthProvider>;
  return <PublicPage legalKind={legalDocumentKind(path)} />;
}

function CoreHandoff({ destination }: { destination: string }) {
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <Loading />;
}
