export type ModuleId =
  | "overview"
  | "farm"
  | "crops"
  | "operations"
  | "irrigation"
  | "plans"
  | "harvests"
  | "monitoring"
  | "weather"
  | "notebook"
  | "resources"
  | "inventory"
  | "costs"
  | "privacy"
  | "settings";

export type NavigationGroupId = "overview" | "operation" | "analysis" | "management" | "settings";

export type RouteManifestEntry = {
  id: ModuleId;
  path: string;
  group: NavigationGroupId;
  feature?: "inventory" | "costs" | "privacyByDesign" | "weather";
};

export const routeManifest = [
  { id: "overview", path: "/app", group: "overview" },
  { id: "farm", path: "/app/farm", group: "operation" },
  { id: "crops", path: "/app/crops", group: "operation" },
  { id: "operations", path: "/app/operations", group: "operation" },
  { id: "irrigation", path: "/app/irrigation", group: "operation" },
  { id: "plans", path: "/app/plans", group: "operation" },
  { id: "harvests", path: "/app/harvests", group: "operation" },
  { id: "monitoring", path: "/app/monitoring", group: "analysis" },
  { id: "weather", path: "/app/weather", group: "analysis", feature: "weather" },
  { id: "notebook", path: "/app/notebook", group: "analysis" },
  { id: "resources", path: "/app/resources", group: "management" },
  { id: "inventory", path: "/app/inventory", group: "management", feature: "inventory" },
  { id: "costs", path: "/app/costs", group: "management", feature: "costs" },
  { id: "privacy", path: "/app/privacy", group: "management", feature: "privacyByDesign" },
  { id: "settings", path: "/app/settings", group: "settings" },
] as const satisfies readonly RouteManifestEntry[];

const routeById = new Map<ModuleId, RouteManifestEntry>(routeManifest.map((route) => [route.id, route]));

export function routeModule(pathname = window.location.pathname): ModuleId {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return routeManifest.find((route) => route.path === normalized)?.id ?? "overview";
}

export function pathForModule(module: ModuleId) {
  return routeById.get(module)?.path ?? "/app";
}

export function isRouteVisible(route: RouteManifestEntry, features: Record<string, unknown>) {
  if (!route.feature) return true;
  if (route.feature === "weather") return features.weather === true || typeof features.agronomicWeather === "string";
  return features[route.feature] === true;
}
