import type { Request } from "express";

const APPLICATION_CODE = "farm";
const SESSION_COOKIE = "gero_session";
const CSRF_COOKIE = "gero_csrf";

export type CoreMe = {
  id: string;
  email: string;
  name: string;
  preferredLocale: string;
  preferences: Record<string, unknown>;
  status: string;
  emailVerifiedAt: string | null;
  platformRoles: string[];
};

export type CoreOrganization = {
  organization: { id: string; name: string; slug: string; status: string };
  membership: { role: string; status: string };
};

export type CoreAccess = {
  organization: CoreOrganization["organization"];
  membership: CoreOrganization["membership"];
  application: { id: string; code: string; name: string; slug: string; status: string; url: string | null };
  applicationMembership: { profile: string; status: string; expiresAt: string | null; temporary: boolean; permissions: string[]; permissionOverrides: { allow: string[]; deny: string[] } };
  access: { allowed: boolean; reason: string | null; evaluatedAt: string; mode: "full" | "read_only" | "denied"; writeAllowed: boolean; exportAllowed: boolean; graceEndsAt: string | null };
  subscription: null | {
    id: string;
    status: string;
    startsAt: string;
    trialEndsAt: string | null;
    renewsAt: string | null;
    endsAt: string | null;
    canceledAt: string | null;
    autoRenew: boolean;
    plan: { code: string; name: string; status: string };
  };
  entitlements: {
    features: Record<string, boolean | number | string | null>;
    limits: Record<string, boolean | number | string | null>;
    addons: Array<{ code: string; quantity: number }>;
  };
  onboarding: null | { scope: "single_organization"; status: "not_started" | "in_progress" | "completed"; completedSteps: string[]; settings: Record<string, unknown>; completedAt: string | null };
};

export type CoreBillingCatalog = import("@shared/entitlements").BillingCatalog;

export class CoreApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

function apiBaseUrl() {
  return (process.env.GERO_CORE_API_URL || "https://api.gero.pt").replace(/\/$/, "");
}

function cookiePart(req: Request, name: string) {
  return req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
}

async function parseBody<T>(response: Response) {
  return response.json().catch(() => null) as Promise<{ data?: T; error?: { code?: string; message?: string } } | null>;
}

async function coreRequest<T>(req: Request, path: string): Promise<T> {
  const session = cookiePart(req, SESSION_COOKIE);
  if (!session) throw new CoreApiError(401, "Authentication required", "SESSION_REQUIRED");

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      headers: { accept: "application/json", cookie: session },
      signal: AbortSignal.timeout(Number(process.env.GERO_CORE_TIMEOUT_MS || 5000)),
    });
  } catch {
    throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE");
  }

  const body = await parseBody<T>(response);
  if (!response.ok) {
    const status = response.status === 401 || response.status === 404 ? response.status : 503;
    throw new CoreApiError(status, body?.error?.message || "Unable to validate Gero Core access", body?.error?.code);
  }
  if (body?.data === undefined) throw new CoreApiError(503, "Gero Core returned an invalid response", "CORE_INVALID_RESPONSE");
  return body.data;
}

async function publicRequest<T>(path: string): Promise<T> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl()}${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(Number(process.env.GERO_CORE_TIMEOUT_MS || 5000)) }); }
  catch { throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE"); }
  const body = await parseBody<T>(response);
  if (!response.ok || body?.data === undefined) throw new CoreApiError(response.status === 404 ? 404 : 503, body?.error?.message || "Unable to load the Gero Core catalog", body?.error?.code);
  return body.data;
}

async function coreMutation<T>(req: Request, path: string, method: "PATCH" | "POST", body?: unknown) {
  const session = cookiePart(req, SESSION_COOKIE);
  const csrf = cookiePart(req, CSRF_COOKIE);
  if (!session || !csrf) throw new CoreApiError(401, "Authentication required", "SESSION_REQUIRED");
  const csrfValue = decodeURIComponent(csrf.slice(`${CSRF_COOKIE}=`.length));

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        cookie: `${session}; ${csrf}`,
        "x-csrf-token": csrfValue,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(Number(process.env.GERO_CORE_TIMEOUT_MS || 5000)),
    });
  } catch {
    throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE");
  }

  const parsed = response.status === 204 ? null : await parseBody<T>(response);
  if (!response.ok) {
    const status = [400, 401, 403, 404, 409].includes(response.status) ? response.status : 503;
    throw new CoreApiError(status, parsed?.error?.message || "Gero Core request failed", parsed?.error?.code);
  }
  return { data: parsed?.data, cookies: response.headers.getSetCookie() };
}

export const geroCore = {
  me: (req: Request) => coreRequest<CoreMe>(req, "/api/v1/me"),
  organizations: (req: Request) => coreRequest<CoreOrganization[]>(req, "/api/v1/me/organizations"),
  applications: (req: Request) => coreRequest<CoreAccess[]>(req, "/api/v1/me/applications"),
  access: (req: Request, organizationId: string) => coreRequest<CoreAccess>(
    req,
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/access`,
  ),
  catalog: () => publicRequest<CoreBillingCatalog>(`/api/v1/billing/catalog/${APPLICATION_CODE}`),
  async checkout(req: Request, organizationId: string, input: { kind: "plan" | "addon"; code: string; billingPeriod: "monthly" | "yearly"; quantity: number; successUrl: string; cancelUrl: string }) {
    return (await coreMutation<{ url: string }>(req, `/api/v1/billing/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/checkout`, "POST", input)).data;
  },
  async updatePreferredLocale(req: Request, preferredLocale: "pt-PT" | "es") {
    return (await coreMutation<{ preferredLocale: string }>(req, "/api/v1/me/profile", "PATCH", { preferredLocale })).data;
  },
  async logout(req: Request) {
    return (await coreMutation<never>(req, "/api/v1/auth/logout", "POST")).cookies;
  },
  weather: {
    get: <T>(req: Request, organizationId: string, path: string) => coreRequest<T>(req, weatherPath(organizationId, path)),
    post: async <T>(req: Request, organizationId: string, path: string, body?: unknown) => (await coreMutation<T>(req, weatherPath(organizationId, path), "POST", body)).data as T,
    patch: async <T>(req: Request, organizationId: string, path: string, body?: unknown) => (await coreMutation<T>(req, weatherPath(organizationId, path), "PATCH", body)).data as T,
  },
};

function weatherPath(organizationId: string, path: string) {
  const suffix = path.replace(/^\/+/, "");
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/weather/${suffix}`;
}

export function corePublicUrl(path = "") {
  const base = (process.env.GERO_CORE_PUBLIC_URL || "https://core.gero.pt").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function accountPublicUrl(path = "") {
  const base = (process.env.GERO_ACCOUNT_PUBLIC_URL || "https://account.gero.pt").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
