import crypto from "node:crypto";
import type { Request, Response } from "express";

const COOKIE_NAME = "gero_farm_organization";

function secret() {
  const value = process.env.FARM_TENANT_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("FARM_TENANT_SECRET must contain at least 32 characters in production");
  }
  return value || "gerofarm-development-organization-selection";
}

function signature(organizationId: string) {
  return crypto.createHmac("sha256", secret()).update(organizationId).digest("base64url");
}

export function selectedOrganizationId(req: Request) {
  const raw = req.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [organizationId, suppliedSignature] = decodeURIComponent(raw).split(".");
  if (!organizationId || !suppliedSignature) return null;
  const expected = Buffer.from(signature(organizationId));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied) ? organizationId : null;
}

export function setSelectedOrganization(res: Response, organizationId: string) {
  const value = encodeURIComponent(`${organizationId}.${signature(organizationId)}`);
  res.append("set-cookie", `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export function assertSameOrigin(req: Request) {
  const origin = req.get("origin");
  if (!origin) return;
  const configured = process.env.FARM_PUBLIC_URL?.replace(/\/$/, "");
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0] || req.protocol;
  const requestOrigin = `${forwardedProto}://${req.get("host")}`;
  if (origin !== configured && origin !== requestOrigin) throw new RequestOriginError();
}

export class RequestOriginError extends Error {
  readonly status = 403;
  constructor() { super("Cross-origin request rejected"); }
}
