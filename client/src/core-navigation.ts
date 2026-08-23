const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function httpUrl(value: string) {
  try {
    const target = new URL(value);
    return ["http:", "https:"].includes(target.protocol) && !target.username && !target.password ? target : null;
  } catch { return null; }
}

export function organizationHandoff(currentUrl: string) {
  const target = httpUrl(currentUrl);
  if (!target) return { requested: false, organizationId: null, cleanUrl: currentUrl };
  const supplied = target.searchParams.get("organizationId");
  target.searchParams.delete("organizationId");
  return {
    requested: supplied !== null,
    organizationId: supplied && UUID_PATTERN.test(supplied) ? supplied : null,
    cleanUrl: target.toString(),
  };
}

export function applicationReturnTo(currentUrl: string) {
  const target = httpUrl(currentUrl);
  if (!target) return null;
  target.searchParams.delete("organizationId");
  return target.toString();
}

export function centralDestination(centralUrl: string, returnTo: string | null) {
  const target = httpUrl(centralUrl);
  if (!target) return null;
  if (returnTo && httpUrl(returnTo)) target.searchParams.set("returnTo", returnTo);
  return target.toString();
}

export function reservedApplicationHandoff(currentUrl: string) {
  const target = httpUrl(currentUrl);
  if (!target || target.pathname !== "/") return null;
  const organizationId = target.searchParams.get("organizationId");
  if (!organizationId || !UUID_PATTERN.test(organizationId)) return null;
  target.pathname = "/app";
  return target.toString();
}
