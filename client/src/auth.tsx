import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { applicationReturnTo, centralDestination, organizationHandoff } from "./core-navigation";
import type { SupportedLocale } from "@shared/locales";
import { bootstrapFetch, BootstrapRequestError } from "./auth-bootstrap";

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
    applicationMembership: { profile: string; status: string; expiresAt: string | null; temporary: boolean; permissions: string[]; permissionOverrides: { allow: string[]; deny: string[] } };
    access: { allowed: boolean; reason: string | null; evaluatedAt: string; mode: "full" | "read_only" | "denied"; writeAllowed: boolean; exportAllowed: boolean; graceEndsAt: string | null };
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
  retryBootstrap: () => void;
  selectOrganization: (organizationId: string) => Promise<void>;
  updateLocale: (preferredLocale: SupportedLocale) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadConfig(signal?: AbortSignal) {
  const response = await bootstrapFetch("/api/auth/config", { credentials: "include", signal });
  if (!response.ok) throw new Error("A configuração de acesso não está disponível");
  return response.json() as Promise<CoreConfig>;
}

async function selectOrganizationRequest(organizationId: string, signal?: AbortSignal) {
  return bootstrapFetch("/api/auth/select-organization", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId }),
    signal,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [config, setConfig] = useState<CoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const retryBootstrap = useCallback(() => {
    setError(null);
    setLoading(true);
    setBootstrapAttempt((attempt) => attempt + 1);
  }, []);

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
    const controller = new AbortController();
    let active = true;
    void (async () => {
      let redirecting = false;
      try {
        const nextConfig = await loadConfig(controller.signal);
        if (!active) return;
        setConfig(nextConfig);
        const handoff = organizationHandoff(window.location.href);
        if (handoff.requested) {
          const response = handoff.organizationId ? await selectOrganizationRequest(handoff.organizationId, controller.signal) : null;
          if (!response?.ok) {
            if ([400, 401, 403, 404].includes(response?.status ?? 400)) {
              redirecting = true;
              window.location.replace(centralDestination(nextConfig.applicationSelectorUrl, handoff.cleanUrl) || nextConfig.applicationSelectorUrl);
              return;
            }
            throw new Error("Não foi possível preparar a organização no GeroFarm");
          }
          window.history.replaceState(window.history.state, "", handoff.cleanUrl);
        }
        const response = await bootstrapFetch("/api/auth/me", { credentials: "include", signal: controller.signal });
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
        if (active) setSession(body);
      } catch (caught) {
        if (active && !(caught instanceof BootstrapRequestError && caught.kind === "cancelled")) {
          setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o GeroFarm");
        }
      } finally {
        if (active && !redirecting) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [bootstrapAttempt]);

  const selectOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    try {
      const response = await selectOrganizationRequest(organizationId);
      if (!response.ok) throw new Error("Não foi possível mudar de organização");
      await refresh();
    } finally { setLoading(false); }
  }, [refresh]);

  const updateLocale = useCallback(async (preferredLocale: SupportedLocale) => {
    const response = await fetch("/api/auth/locale", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredLocale }),
    });
    const body = await response.json().catch(() => null) as { preferredLocale?: string } | null;
    if (!response.ok || body?.preferredLocale !== preferredLocale) throw new Error("LOCALE_UPDATE_FAILED");
    setSession((current) => current ? { ...current, user: { ...current.user, preferredLocale } } : current);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setSession(null);
    window.location.assign("/");
  }, []);

  return <AuthContext.Provider value={{ session, config, loading, error, retryBootstrap, selectOrganization, updateLocale, logout }}>{children}</AuthContext.Provider>;
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
