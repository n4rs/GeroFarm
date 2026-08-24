import type { CoreConfig } from "../../auth";

export function entitlementValueEnabled(value: unknown) {
  return value !== false && value !== null && value !== undefined && value !== 0 && value !== "";
}

function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}

export function settingsCoreLinks(config: CoreConfig | null) {
  const account = safeHttpUrl(config?.accountUrl);
  const administration = safeHttpUrl(config?.administrationUrl);
  const section = (hash: "profile" | "organizations") => {
    if (!account) return null;
    const target = new URL(account);
    target.hash = hash;
    return target.toString();
  };
  const security = account ? new URL("/account/security", account) : null;
  return {
    account: account?.toString() ?? null,
    profile: section("profile"),
    organizations: section("organizations"),
    security: security?.toString() ?? null,
    administration: administration?.toString() ?? null,
  };
}
