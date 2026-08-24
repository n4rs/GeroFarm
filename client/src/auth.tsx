import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { applicationReturnTo, centralDestination, organizationHandoff } from "./core-navigation";

type OrganizationMembership = {
  organization: { id: string; name: string; slug: string; status: string };
  membership: { role: string; status: string };
};

export type AccountSession = {
  user: { id: string; email: string; name: string; preferredLocale: string; status: string };
  organizations: OrganizationMembership[];
  selectedOrganizationId: string;
  access: {
    organization: OrganizationMembership["organization"];
    membership: OrganizationMembership["membership"];
    access: { allowed: boolean; reason: string | null; evaluatedAt: string };
    subscription: null | { status: string; plan: { code: string; name: string; status: string } };
    entitlements: { features: Record<string, unknown>; limits: Record<string, unknown>; addons: Array<{ code: string; quantity: number }> };
  };
};

export type CoreConfig = {
  coreUrl: string;
  loginUrl: string;
  registerUrl: string;
  accountUrl: string;
  applicationSelectorUrl: string;
  administrationUrl: string;
};

type AuthState = {
  session: AccountSession | null;
  config: CoreConfig | null;
  loading: boolean;
  error: string | null;
  selectOrganization: (organizationId: string) => Promise<void>;
  updateLocale: (preferredLocale: "pt-PT" | "es") => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadConfig() {
  const response = await fetch("/api/auth/config", { credentials: "include" });
  if (!response.ok) throw new Error("A configuração de acesso não está disponível");
  return response.json() as Promise<CoreConfig>;
}

async function selectOrganizationRequest(organizationId: string) {
  return fetch("/api/auth/select-organization", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [config, setConfig] = useState<CoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (response.status === 401) {
      const currentConfig = config || await loadConfig();
      const returnTo = applicationReturnTo(window.location.href) || `${window.location.origin}/app`;
      window.location.replace(`${currentConfig.loginUrl}?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (response.status === 403 || response.status === 404) {
      const currentConfig = config || await loadConfig();
      const returnTo = applicationReturnTo(window.location.href) || `${window.location.origin}/app`;
      window.location.replace(centralDestination(currentConfig.applicationSelectorUrl, returnTo) || currentConfig.applicationSelectorUrl);
      return;
    }
    const body = await response.json().catch(() => null) as (AccountSession & { message?: string }) | null;
    if (!response.ok || !body) throw new Error(body?.message || "Não foi possível validar o acesso ao GeroFarm");
    setSession(body);
  }, [config]);

  useEffect(() => {
    void (async () => {
      let redirecting = false;
      try {
        const nextConfig = await loadConfig();
        setConfig(nextConfig);
        const handoff = organizationHandoff(window.location.href);
        if (handoff.requested) {
          const response = handoff.organizationId ? await selectOrganizationRequest(handoff.organizationId) : null;
          if (!response?.ok) {
            redirecting = true;
            window.location.replace(centralDestination(nextConfig.applicationSelectorUrl, handoff.cleanUrl) || nextConfig.applicationSelectorUrl);
            return;
          }
          window.history.replaceState(window.history.state, "", handoff.cleanUrl);
        }
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.status === 401) {
          redirecting = true;
          const returnTo = applicationReturnTo(window.location.href) || `${window.location.origin}/app`;
          window.location.replace(`${nextConfig.loginUrl}?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        if (response.status === 403 || response.status === 404) {
          redirecting = true;
          const returnTo = applicationReturnTo(window.location.href) || `${window.location.origin}/app`;
          window.location.replace(centralDestination(nextConfig.applicationSelectorUrl, returnTo) || nextConfig.applicationSelectorUrl);
          return;
        }
        const body = await response.json().catch(() => null) as (AccountSession & { message?: string }) | null;
        if (!response.ok || !body) throw new Error(body?.message || "Não foi possível validar o acesso ao GeroFarm");
        setSession(body);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o GeroFarm");
      } finally {
        if (!redirecting) setLoading(false);
      }
    })();
  }, []);

  const selectOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    try {
      const response = await selectOrganizationRequest(organizationId);
      if (!response.ok) throw new Error("Não foi possível mudar de organização");
      await refresh();
    } finally { setLoading(false); }
  }, [refresh]);

  const updateLocale = useCallback(async (preferredLocale: "pt-PT" | "es") => {
    const response = await fetch("/api/auth/locale", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredLocale }),
    });
    if (!response.ok) throw new Error("Não foi possível atualizar o idioma");
    setSession((current) => current ? { ...current, user: { ...current.user, preferredLocale } } : current);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setSession(null);
    window.location.assign("/");
  }, []);

  return <AuthContext.Provider value={{ session, config, loading, error, selectOrganization, updateLocale, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export async function redirectToAccount(destination: "loginUrl" | "registerUrl") {
  const config = await loadConfig();
  const returnTo = `${window.location.origin}/app`;
  window.location.replace(`${config[destination]}?returnTo=${encodeURIComponent(returnTo)}`);
}
