import type { Request } from "express";
import type { SupportedLocale } from "@shared/locales";
import type { WeatherBaseSeries, WeatherStationAssignment, WeatherStationProvenance, WeatherStationSuggestion, WeatherVirtualStation } from "@shared/weather";
import { z } from "zod";

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

const entitlementValue = z.union([z.boolean(), z.number().finite(), z.string(), z.null()]);
const organizationSchema = z.object({
  organization: z.object({ id: z.string().uuid(), name: z.string().min(1), slug: z.string().min(1), status: z.string().min(1) }),
  membership: z.object({ role: z.string().min(1), status: z.string().min(1) }),
});
const meSchema: z.ZodType<CoreMe> = z.object({
  id: z.string().uuid(), email: z.string().email(), name: z.string().min(1), preferredLocale: z.string().min(1),
  preferences: z.record(z.unknown()), status: z.string().min(1), emailVerifiedAt: z.string().nullable(), platformRoles: z.array(z.string()),
});
const accessSchema: z.ZodType<CoreAccess> = organizationSchema.extend({
  application: z.object({ id: z.string().uuid(), code: z.string(), name: z.string(), slug: z.string(), status: z.string(), url: z.string().url().nullable() }),
  applicationMembership: z.object({ profile: z.string(), status: z.string(), expiresAt: z.string().nullable(), temporary: z.boolean(), permissions: z.array(z.string()), permissionOverrides: z.object({ allow: z.array(z.string()), deny: z.array(z.string()) }) }),
  access: z.object({ allowed: z.boolean(), reason: z.string().nullable(), evaluatedAt: z.string(), mode: z.enum(["full", "read_only", "denied"]), writeAllowed: z.boolean(), exportAllowed: z.boolean(), graceEndsAt: z.string().nullable() }),
  subscription: z.object({ id: z.string().uuid(), status: z.string(), startsAt: z.string(), trialEndsAt: z.string().nullable(), renewsAt: z.string().nullable(), endsAt: z.string().nullable(), canceledAt: z.string().nullable(), autoRenew: z.boolean(), plan: z.object({ code: z.string(), name: z.string(), status: z.string() }) }).nullable(),
  entitlements: z.object({ features: z.record(entitlementValue), limits: z.record(entitlementValue), addons: z.array(z.object({ code: z.string(), quantity: z.number().int().nonnegative() })) }),
  onboarding: z.object({ scope: z.literal("single_organization"), status: z.enum(["not_started", "in_progress", "completed"]), completedSteps: z.array(z.string()), settings: z.record(z.unknown()), completedAt: z.string().nullable() }).nullable(),
});
const billingPriceSchema = z.object({ id: z.string(), billingPeriod: z.enum(["monthly", "yearly"]), priceCents: z.number().int().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), status: z.string() });
const catalogSchema: z.ZodType<CoreBillingCatalog> = z.object({
  plans: z.array(z.object({ code: z.string(), name: z.string(), description: z.string().nullable(), status: z.string(), limits: z.record(entitlementValue), prices: z.array(billingPriceSchema) })),
  addons: z.array(z.object({ code: z.string(), name: z.string(), description: z.string().nullable(), status: z.string(), entitlements: z.record(entitlementValue), eligiblePlanCodes: z.array(z.string()), incompatibleAddonCodes: z.array(z.string()), maxQuantity: z.number().int().nonnegative(), prices: z.array(billingPriceSchema) })),
});
const checkoutSchema = z.object({ url: z.string().url().superRefine((value, context) => { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password || !(url.hostname === "checkout.stripe.com" || url.hostname.endsWith(".stripe.com"))) context.addIssue({ code: "custom", message: "checkout URL must use the approved Stripe host" }); }) });
export const weatherStationSchema: z.ZodType<WeatherVirtualStation> = z.object({ id: z.string().uuid(), organizationId: z.string().uuid(), name: z.string(), latitude: z.number().finite(), longitude: z.number().finite(), elevationM: z.number().finite().nullable(), timezone: z.string(), archivedAt: z.string().datetime().nullable(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const weatherAssignmentSchema: z.ZodType<WeatherStationAssignment> = z.object({ id: z.string().uuid(), stationId: z.string().uuid(), subjectType: z.enum(["plantation", "campaign"]), subjectId: z.string(), effectiveFrom: z.string().datetime(), effectiveTo: z.string().datetime().nullable() });
export const weatherProvenanceSchema: z.ZodType<WeatherStationProvenance> = z.object({ station: weatherStationSchema, assignment: weatherAssignmentSchema.nullable(), requestedFor: z.string() });
export const weatherSuggestionSchema: z.ZodType<WeatherStationSuggestion> = z.object({ station: weatherStationSchema, distanceKm: z.number().finite().nonnegative() });
const nullableWeatherNumber = z.number().finite().nullable();
const seriesValues = {
  temperatureC: nullableWeatherNumber, apparentTemperatureC: nullableWeatherNumber, precipitationProbability: nullableWeatherNumber, precipitationIntensityMmPerHour: nullableWeatherNumber, precipitationAccumulationMm: nullableWeatherNumber,
  precipitationType: z.enum(["none", "rain", "snow", "sleet", "mixed", "unknown"]).nullable(), humidityPercent: nullableWeatherNumber, windSpeedKph: nullableWeatherNumber, windGustKph: nullableWeatherNumber, windBearingDegrees: nullableWeatherNumber, pressureHpa: nullableWeatherNumber, cloudCoverPercent: nullableWeatherNumber, uvIndex: nullableWeatherNumber, dewPointC: nullableWeatherNumber, solarRadiationWm2: nullableWeatherNumber, elevationM: nullableWeatherNumber,
  temporalStatus: z.enum(["observed", "forecast"]), valueSource: z.enum(["measured", "estimated"]),
};
const seriesHourSchema = z.object({ at: z.string().datetime(), ...seriesValues });
const seriesDaySchema = z.object({ date: z.string().date(), ...seriesValues, temperatureMinC: nullableWeatherNumber, temperatureMaxC: nullableWeatherNumber });
export const weatherBaseSeriesSchema = z.object({
  contractVersion: z.literal("2"), subject: z.object({ subjectType: z.enum(["plantation", "campaign"]), subjectId: z.string() }), interval: z.object({ from: z.string().date(), to: z.string().date(), maximumDays: z.number().int().positive() }), page: z.object({ from: z.string().date(), to: z.string().date(), sizeDays: z.number().int().positive(), nextCursor: z.string().nullable() }), timezone: z.string().nullable(), units: z.literal("metric"),
  hourly: z.array(seriesHourSchema), daily: z.array(seriesDaySchema), stationPeriods: z.array(z.object({ from: z.string().date(), to: z.string().date(), station: weatherStationSchema, assignment: weatherAssignmentSchema })),
  coverage: z.object({ requestedDays: z.number().int().nonnegative(), daysWithHourlyData: z.number().int().nonnegative(), daysWithDailyData: z.number().int().nonnegative(), requestedHours: z.number().int().nonnegative(), availableHours: z.number().int().nonnegative(), complete: z.boolean(), gaps: z.array(z.object({ from: z.string().date(), to: z.string().date(), reason: z.enum(["station_not_assigned", "provider_unavailable", "hourly_data_unavailable", "daily_data_unavailable"]) })) }),
  meta: z.object({ provider: z.string(), fetchedAt: z.string().datetime().nullable(), cached: z.boolean(), stale: z.boolean(), cache: z.object({ status: z.enum(["miss", "fresh", "stale", "mixed", "not_requested"]), requests: z.number().int().nonnegative(), hits: z.number().int().nonnegative(), misses: z.number().int().nonnegative() }) }),
}).passthrough() as unknown as z.ZodType<WeatherBaseSeries>;

function apiBaseUrl() {
  return configuredBaseUrl(process.env.GERO_CORE_API_URL || "https://api.gero.pt", "GERO_CORE_API_URL");
}

function configuredBaseUrl(value: string, label: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an absolute HTTP(S) URL`); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error(`${label} must be a credential-free${process.env.NODE_ENV === "production" ? " HTTPS" : " HTTP(S)"} URL`);
  return url.toString().replace(/\/$/, "");
}

function coreTimeoutMs() {
  const parsed = z.coerce.number().int().min(250).max(30_000).safeParse(process.env.GERO_CORE_TIMEOUT_MS || 5000);
  if (!parsed.success) throw new Error("GERO_CORE_TIMEOUT_MS must be between 250 and 30000 milliseconds");
  return parsed.data;
}

function cookiePart(req: Request, name: string) {
  return req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
}

async function parseBody<T>(response: Response) {
  return response.json().catch(() => null) as Promise<{ data?: T; error?: { code?: string; message?: string } } | null>;
}

function validateCoreData<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new CoreApiError(503, "Gero Core returned an invalid response", "CORE_INVALID_RESPONSE");
  return parsed.data;
}

async function coreRequest<T>(req: Request, path: string, schema: z.ZodType<T>): Promise<T> {
  const session = cookiePart(req, SESSION_COOKIE);
  if (!session) throw new CoreApiError(401, "Authentication required", "SESSION_REQUIRED");

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      headers: { accept: "application/json", cookie: session },
      signal: AbortSignal.timeout(coreTimeoutMs()),
    });
  } catch {
    throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE");
  }

  const body = await parseBody<T>(response);
  if (!response.ok) {
    const status = [400, 401, 403, 404, 409, 422, 429].includes(
      response.status,
    )
      ? response.status
      : 503;
    throw new CoreApiError(status, body?.error?.message || "Unable to validate Gero Core access", body?.error?.code);
  }
  if (body?.data === undefined) throw new CoreApiError(503, "Gero Core returned an invalid response", "CORE_INVALID_RESPONSE");
  return validateCoreData(schema, body.data);
}

async function publicRequest<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl()}${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(coreTimeoutMs()) }); }
  catch { throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE"); }
  const body = await parseBody<T>(response);
  if (!response.ok || body?.data === undefined) throw new CoreApiError(response.status === 404 ? 404 : 503, body?.error?.message || "Unable to load the Gero Core catalog", body?.error?.code);
  return validateCoreData(schema, body.data);
}

async function coreMutation<T>(req: Request, path: string, method: "PATCH" | "POST", body?: unknown) {
  const session = cookiePart(req, SESSION_COOKIE);
  const csrf = cookiePart(req, CSRF_COOKIE);
  if (!session || !csrf) throw new CoreApiError(401, "Authentication required", "SESSION_REQUIRED");
  let csrfValue: string;
  try { csrfValue = decodeURIComponent(csrf.slice(`${CSRF_COOKIE}=`.length)); } catch { throw new CoreApiError(400, "Invalid CSRF cookie", "CSRF_INVALID"); }

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
      signal: AbortSignal.timeout(coreTimeoutMs()),
    });
  } catch {
    throw new CoreApiError(503, "Gero Core is temporarily unavailable", "CORE_UNAVAILABLE");
  }

  const parsed = response.status === 204 ? null : await parseBody<T>(response);
  if (!response.ok) {
    const status = [400, 401, 403, 404, 409, 422, 429].includes(response.status) ? response.status : 503;
    throw new CoreApiError(status, parsed?.error?.message || "Gero Core request failed", parsed?.error?.code);
  }
  return { data: parsed?.data, cookies: response.headers.getSetCookie() };
}

export const geroCore = {
  me: (req: Request) => coreRequest(req, "/api/v1/me", meSchema),
  organizations: (req: Request) => coreRequest(req, "/api/v1/me/organizations", z.array(organizationSchema)),
  applications: (req: Request) => coreRequest(req, "/api/v1/me/applications", z.array(accessSchema)),
  access: async (req: Request, organizationId: string) => {
    const result = await coreRequest(
    req,
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/access`,
    accessSchema,
    );
    if (result.organization.id !== organizationId || result.application.code !== APPLICATION_CODE) throw new CoreApiError(503, "Gero Core returned mismatched access context", "CORE_INVALID_RESPONSE");
    return result;
  },
  catalog: () => publicRequest(`/api/v1/billing/catalog/${APPLICATION_CODE}`, catalogSchema),
  async checkout(req: Request, organizationId: string, input: { kind: "plan" | "addon"; code: string; billingPeriod: "monthly" | "yearly"; quantity: number; successUrl: string; cancelUrl: string }) {
    const data = (await coreMutation<unknown>(req, `/api/v1/billing/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/checkout`, "POST", input)).data;
    return validateCoreData(checkoutSchema, data);
  },
  async updatePreferredLocale(req: Request, preferredLocale: SupportedLocale) {
    const result = (await coreMutation<unknown>(req, "/api/v1/me/profile", "PATCH", { preferredLocale })).data;
    return validateCoreData(z.object({ preferredLocale: z.string() }), result);
  },
  async logout(req: Request) {
    return (await coreMutation<never>(req, "/api/v1/auth/logout", "POST")).cookies;
  },
  weather: {
    get: <T>(req: Request, organizationId: string, path: string, schema: z.ZodType<T>) => coreRequest(req, weatherPath(organizationId, path), schema),
    post: async <T>(req: Request, organizationId: string, path: string, schema: z.ZodType<T>, body?: unknown) => validateCoreData(schema, (await coreMutation<unknown>(req, weatherPath(organizationId, path), "POST", body)).data),
    patch: async <T>(req: Request, organizationId: string, path: string, schema: z.ZodType<T>, body?: unknown) => validateCoreData(schema, (await coreMutation<unknown>(req, weatherPath(organizationId, path), "PATCH", body)).data),
  },
};

function weatherPath(organizationId: string, path: string) {
  const suffix = path.replace(/^\/+/, "");
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/applications/${APPLICATION_CODE}/weather/${suffix}`;
}

export function corePublicUrl(path = "") {
  const base = configuredBaseUrl(process.env.GERO_CORE_PUBLIC_URL || "https://core.gero.pt", "GERO_CORE_PUBLIC_URL");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function accountPublicUrl(path = "") {
  const base = configuredBaseUrl(process.env.GERO_ACCOUNT_PUBLIC_URL || "https://account.gero.pt", "GERO_ACCOUNT_PUBLIC_URL");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
