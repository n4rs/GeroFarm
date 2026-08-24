import { useEffect } from "react";
import { AuthProvider, redirectToAccount, useAuth } from "./auth";
import { reservedApplicationHandoff } from "./core-navigation";
import MarketingHome from "./MarketingHome";
import { I18nProvider } from "./i18n";

function AccountRedirect({ destination }: { destination: "loginUrl" | "registerUrl" }) {
  useEffect(() => { void redirectToAccount(destination); }, [destination]);
  return <Loading />;
}

function Loading() {
  return <main className="state"><div className="spinner" aria-label="A carregar" /></main>;
}

function Home() {
  return <I18nProvider><MarketingHome /></I18nProvider>;
}

function Workspace() {
  const { session, loading, error, selectOrganization, updateLocale, logout } = useAuth();
  if (loading) return <Loading />;
  if (error || !session) return <main className="state"><div className="card"><h1>Não foi possível abrir o GeroFarm</h1><p>{error}</p><a className="button" href="/">Voltar</a></div></main>;
  if (!session.access.access.allowed) return <main className="state"><div className="card"><p className="eyebrow">Acesso GeroFarm</p><h1>Esta organização ainda não tem acesso.</h1><p>Escolha um plano ou contacte a equipa comercial para ativar esta organização.</p><a className="button" href="/#plans">Ver planos</a></div></main>;

  return <main className="workspace">
    <header><a className="brand" href="/" aria-label="GeroFarm"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm" /></a><div className="header-actions">
      {session.organizations.length > 1 && <select aria-label="Organização" value={session.selectedOrganizationId} onChange={(event) => void selectOrganization(event.target.value)}>
        {session.organizations.map(({ organization }) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}
      </select>}
      <select aria-label="Idioma" value={session.user.preferredLocale === "es" ? "es" : "pt-PT"} onChange={(event) => void updateLocale(event.target.value as "pt-PT" | "es")}>
        <option value="pt-PT">PT</option><option value="es">ES</option>
      </select>
      <button className="link-button" onClick={() => void logout()}>Sair</button>
    </div></header>
    <section className="welcome"><p className="eyebrow">Área de trabalho</p><h1>Olá, {session.user.name}.</h1><p>A organização <b>{session.access.organization.name}</b> está selecionada e pronta para trabalhar.</p>
      <div className="status-grid"><div><span>Conta</span><b>Autenticada</b></div><div><span>Organização</span><b>Selecionada</b></div><div><span>Acesso</span><b>Autorizado</b></div></div>
    </section>
  </main>;
}

export default function App() {
  const path = window.location.pathname;
  const handoff = reservedApplicationHandoff(window.location.href);
  if (handoff) return <CoreHandoff destination={handoff} />;
  if (path === "/login") return <AccountRedirect destination="loginUrl" />;
  if (path === "/register") return <AccountRedirect destination="registerUrl" />;
  if (path === "/app" || path.startsWith("/app/")) return <AuthProvider><Workspace /></AuthProvider>;
  return <Home />;
}

function CoreHandoff({ destination }: { destination: string }) {
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <Loading />;
}
