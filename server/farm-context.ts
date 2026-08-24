import type { Request } from "express";
import { product } from "@shared/product";
import { CoreApiError, geroCore, type CoreMe, type CoreOrganization } from "./gero-core-client";
import { selectedOrganizationId } from "./organization-selection";

export type FarmRequestContext = { user: CoreMe; organization: CoreOrganization["organization"] & { timezone?: string }; membership: CoreOrganization["membership"] };
export type FarmContextResolver = (req: Request) => Promise<FarmRequestContext>;

export const resolveFarmContext: FarmContextResolver = async (req) => {
  const [user, organizations] = await Promise.all([geroCore.me(req), geroCore.organizations(req)]);
  if (user.status !== "active") throw new CoreApiError(401, "Account is not active", "ACCOUNT_INACTIVE");
  const preferred = selectedOrganizationId(req);
  const selected = organizations.find(({ organization }) => organization.id === preferred) || organizations[0];
  if (!selected) throw new CoreApiError(404, "No organization is available", "ORGANIZATION_NOT_FOUND");
  if (selected.membership.status !== "active") throw new CoreApiError(403, "Membership is not active", "MEMBERSHIP_INACTIVE");
  const access = await geroCore.access(req, selected.organization.id);
  if (access.application.code !== product.code || !access.access.allowed) throw new CoreApiError(403, "Application access denied", "ACCESS_DENIED");
  const timezone = typeof user.preferences.timezone === "string" ? user.preferences.timezone : "Europe/Lisbon";
  return { user, organization: { ...selected.organization, timezone }, membership: selected.membership };
};
