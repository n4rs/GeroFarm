import { useEffect } from "react";
import { AuthProvider, redirectToAccount, useAuth } from "./auth";
import { reservedApplicationHandoff } from "./core-navigation";

function AccountRedirect({ destination }: { destination: "loginUrl" | "registerUrl" }) {
  useEffect(() => { void redirectToAccount(destination); }, [destination]);
  return <Loading />;
}

function Loading() {
  return <main className="state"><div className="spinner" aria-label="A carregar" /></main>;
}

function Home() {
  return <main className="home">
    <nav><a className="brand" href="/">Gero<span>Farm</span></a><a className="button secondary" href="/login">Entrar</a></nav>
    <section className="hero">
      <p className="eyebrow">A nova base digital da exploração agrícola</p>
      <h1>A preparar o terreno para uma gestão agrícola mais clara.</h1>
      <p>O GeroFarm está a construir a sua fundação. A identidade, as organizações e o acesso são geridos de forma central pelo ecossistema Gero.</p>
      <div className="actions"><a className="button" href="/login">Entrar com a conta Gero</a><a className="text-link" href="https://account.gero.pt">Gerir conta</a></div>
    </section>
    <section className="foundation" aria-label="Fundação técnica">
      <div><b>Conta central</b><span>Uma identidade segura em todas as aplicações Gero.</span></div>
      <div><b>Organizações</b><span>Contexto isolado para cada exploração e entidade.</span></div>
      <div><b>Acesso controlado</b><span>Planos e permissões validados pelo GeroCore.</span></div>
    </section>
  </main>;
}

function Workspace() {
  const { session, config, loading, error, selectOrganization, updateLocale, logout } = useAuth();
  if (loading) return <Loading />;
  if (error || !session) return <main className="state"><div className="card"><h1>Não foi possível abrir o GeroFarm</h1><p>{error}</p><a className="button" href="/">Voltar</a></div></main>;
  if (!session.access.access.allowed) return <main className="state"><div className="card"><p className="eyebrow">Acesso GeroFarm</p><h1>Esta organização ainda não tem acesso.</h1><p>O acesso é gerido centralmente na conta Gero.</p><a className="button" href={config?.accountUrl}>Gerir conta</a></div></main>;

  return <main className="workspace">
    <header><a className="brand" href="/">Gero<span>Farm</span></a><div className="header-actions">
      {session.organizations.length > 1 && <select aria-label="Organização" value={session.selectedOrganizationId} onChange={(event) => void selectOrganization(event.target.value)}>
        {session.organizations.map(({ organization }) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}
      </select>}
      <select aria-label="Idioma" value={session.user.preferredLocale === "es" ? "es" : "pt-PT"} onChange={(event) => void updateLocale(event.target.value as "pt-PT" | "es")}>
        <option value="pt-PT">PT</option><option value="es">ES</option>
      </select>
      <button className="link-button" onClick={() => void logout()}>Sair</button>
    </div></header>
    <section className="welcome"><p className="eyebrow">Fundação ativa</p><h1>Olá, {session.user.name}.</h1><p>A ligação segura ao GeroCore está concluída para <b>{session.access.organization.name}</b>. A plataforma agrícola será construída aqui nas próximas etapas.</p>
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
