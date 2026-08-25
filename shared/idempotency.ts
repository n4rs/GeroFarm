export const idempotentMutationPolicies = [
  { method: "POST", pattern: /^\/api\/farm\/operations$/, name: "create-operation" },
  { method: "POST", pattern: /^\/api\/farm\/operations\/[0-9a-f-]+\/void$/i, name: "void-operation" },
  { method: "POST", pattern: /^\/api\/farm\/operation-catalog$/, name: "create-operation-catalog" },
  { method: "PATCH", pattern: /^\/api\/farm\/operation-catalog\/[0-9a-f-]+$/i, name: "update-operation-catalog" },
  { method: "POST", pattern: /^\/api\/farm\/irrigation\/records$/, name: "create-irrigation-record" },
  { method: "POST", pattern: /^\/api\/farm\/irrigation\/records\/[0-9a-f-]+\/reverse$/i, name: "reverse-irrigation-record" },
  { method: "POST", pattern: /^\/api\/farm\/harvests$/, name: "create-harvest" },
  { method: "POST", pattern: /^\/api\/farm\/field-notebooks$/, name: "issue-field-notebook" },
  { method: "POST", pattern: /^\/api\/farm\/inventory\/receipts$/, name: "receive-inventory" },
  { method: "POST", pattern: /^\/api\/farm\/inventory\/consumptions$/, name: "consume-inventory" },
  { method: "POST", pattern: /^\/api\/farm\/inventory\/consumptions\/[0-9a-f-]+\/regularize$/i, name: "regularize-inventory" },
  { method: "POST", pattern: /^\/api\/farm\/costs$/, name: "create-cost" },
  { method: "POST", pattern: /^\/api\/weather\/campaigns\/[0-9a-f-]+\/agronomic-profiles$/i, name: "save-agronomic-profile" },
  { method: "POST", pattern: /^\/api\/weather\/subjects\/plantation\/[0-9a-f-]+\/conditions$/i, name: "synchronize-weather-conditions" },
  { method: "POST", pattern: /^\/api\/weather\/subjects\/plantation\/[0-9a-f-]+\/agronomic-series$/i, name: "calculate-agronomic-series" },
] as const;

export function idempotentMutationPolicy(method: string, pathname: string) {
  return idempotentMutationPolicies.find((policy) => policy.method === method.toUpperCase() && policy.pattern.test(pathname));
}
