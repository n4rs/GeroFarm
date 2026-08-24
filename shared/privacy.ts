import { z } from "zod";

export const privacyRequestTypes = ["access", "rectification", "erasure", "restriction", "portability", "objection"] as const;
export const privacyRequestStatuses = ["submitted", "in_review", "completed", "rejected", "archived"] as const;
export const createPrivacyRequestSchema = z.object({ type: z.enum(privacyRequestTypes), details: z.string().trim().min(10).max(4000) });
export const reviewPrivacyRequestSchema = z.object({ status: z.enum(["in_review", "completed", "rejected", "archived"]), response: z.string().trim().min(2).max(4000) });
export type PrivacyRequestDto = { id: string; requesterUserId: string; type: typeof privacyRequestTypes[number]; details: string; status: typeof privacyRequestStatuses[number]; response?: string; submittedAt: string; deadlineAt: string; updatedAt: string };
export const farmRetentionPolicies = [
  { category: "operational_records", years: 10, trigger: "record_created", action: "manual_review", legallyControlled: true },
  { category: "phytosanitary_records", years: 10, trigger: "legal_record_date", action: "manual_review", legallyControlled: true },
  { category: "traceability_records", years: 10, trigger: "legal_record_date", action: "manual_review", legallyControlled: true },
  { category: "privacy_requests", years: 6, trigger: "request_completed", action: "anonymise", legallyControlled: false },
  { category: "audit_logs", years: 6, trigger: "record_created", action: "anonymise", legallyControlled: true },
] as const;
export function sanitizePrivacyAuditMetadata(input?: Record<string, unknown>) { const allowed = new Set(["count", "format", "outcome", "requestId", "status", "type"]); const result: Record<string, string | number | boolean | null> = {}; for (const [key, value] of Object.entries(input || {})) if (allowed.has(key) && (value === null || ["string", "number", "boolean"].includes(typeof value))) result[key] = typeof value === "string" ? value.slice(0, 100) : value as number | boolean | null; return result; }
