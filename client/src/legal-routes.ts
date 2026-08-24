export type LegalDocumentKind = "privacy" | "terms" | "cookies";

export function legalDocumentKind(path: string): LegalDocumentKind | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized === "/privacy-policy") return "privacy";
  if (normalized === "/terms") return "terms";
  if (normalized === "/cookie-policy") return "cookies";
  return null;
}
