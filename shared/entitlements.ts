export const farmLimitKeys = ["applicationUsers", "activeAreaHectares", "activePlots", "activePlantations", "virtualStations"] as const;
export type FarmLimitKey = (typeof farmLimitKeys)[number];

export const farmFeatureKeys = ["privacyByDesign", "fieldNotebookExport", "integrations", "inventory", "costs", "agronomicWeather"] as const;
export type FarmFeatureKey = (typeof farmFeatureKeys)[number];
export type EntitlementValue = boolean | number | string | null;

export type FarmUsage = Record<FarmLimitKey, number | null>;
export type FarmLimits = Record<FarmLimitKey, number | null>;

export type EntitlementSummary = {
  plan: { code: string; name: string } | null;
  access: { mode: "full" | "read_only" | "denied"; writeAllowed: boolean; exportAllowed: boolean; graceEndsAt: string | null };
  features: Record<string, EntitlementValue>;
  limits: FarmLimits;
  usage: FarmUsage;
  addons: Array<{ code: string; quantity: number }>;
};

export type CapacityErrorDetails = {
  resource: FarmLimitKey;
  usage: number;
  limit: number;
  requested: number;
};

export function numericLimit(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function limitTransitionAllowed(current: number, projected: number, limit: number | null) {
  return limit === null || projected <= limit + 0.00005 || projected <= current + 0.00005;
}

export type BillingPrice = { id: string; billingPeriod: "monthly" | "yearly"; priceCents: number; currency: string; status: string };
export type BillingPlan = { code: string; name: string; description: string | null; status: string; limits: Record<string, EntitlementValue>; prices: BillingPrice[] };
export type BillingAddon = { code: string; name: string; description: string | null; status: string; entitlements: Record<string, EntitlementValue>; eligiblePlanCodes: string[]; incompatibleAddonCodes: string[]; maxQuantity: number; prices: BillingPrice[] };
export type BillingCatalog = { plans: BillingPlan[]; addons: BillingAddon[] };

export function capacityOptions(catalog: BillingCatalog, summary: EntitlementSummary, resource: FarmLimitKey, requested: number) {
  const activeCodes = new Set(summary.addons.map((item) => item.code));
  const currentLimit = summary.limits[resource];
  const resolves = (value: unknown) => value === null || (typeof value === "number" && value >= requested && (currentLimit === null || value > currentLimit));
  const plans = catalog.plans.filter((item) => item.status === "active" && item.code !== summary.plan?.code && resolves(item.limits[resource])).map((item) => ({ ...item, prices: item.prices.filter((price) => price.status === "active") })).filter((item) => item.prices.length > 0);
  const addons = catalog.addons.filter((item) => item.status === "active" && typeof item.entitlements[resource] === "number" && item.entitlements[resource]! > 0 && (item.eligiblePlanCodes.length === 0 || !!summary.plan && item.eligiblePlanCodes.includes(summary.plan.code)) && !activeCodes.has(item.code) && !item.incompatibleAddonCodes.some((code) => activeCodes.has(code))).map((item) => { const increment=item.entitlements[resource] as number,requiredQuantity=Math.max(1,Math.ceil((requested-(currentLimit??requested))/increment));return{...item,requiredQuantity,prices:item.prices.filter((price)=>price.status==="active")}; }).filter((item) => item.prices.length > 0 && item.requiredQuantity <= item.maxQuantity);
  return { plans, addons };
}
