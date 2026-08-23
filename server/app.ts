import express from "express";
import { z } from "zod";
import { product } from "@shared/product";
import { accountPublicUrl, CoreApiError, corePublicUrl, geroCore } from "./gero-core-client";
import {
  assertSameOrigin,
  RequestOriginError,
  selectedOrganizationId,
  setSelectedOrganization,
} from "./organization-selection";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "256kb" }));
  app.use((_req, res, next) => {
    res.set({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.set("cache-control", "no-store");
    res.json({ status: "ok", application: product.code, version: process.env.npm_package_version ?? "0.1.0" });
  });

  app.get("/api/auth/config", (_req, res) => {
    res.set("cache-control", "no-store");
    res.json({
      coreUrl: corePublicUrl(),
      loginUrl: accountPublicUrl("/login"),
      registerUrl: accountPublicUrl("/register"),
      accountUrl: accountPublicUrl("/account"),
      applicationSelectorUrl: accountPublicUrl("/account/applications"),
      administrationUrl: corePublicUrl("/dashboard"),
    });
  });

  app.get("/api/auth/me", async (req, res, next) => {
    try {
      const [me, organizations, applications] = await Promise.all([
        geroCore.me(req),
        geroCore.organizations(req),
        geroCore.applications(req),
      ]);
      if (me.status !== "active") throw new CoreApiError(401, "Account is not active", "ACCOUNT_INACTIVE");
      if (organizations.length === 0) throw new CoreApiError(404, "No organization is available", "ORGANIZATION_NOT_FOUND");

      const preferred = selectedOrganizationId(req);
      const farmContexts = applications.filter(({ application }) => application.code === product.code);
      const accessibleIds = new Set(
        farmContexts.filter(({ access }) => access.allowed).map(({ organization }) => organization.id),
      );
      const accessibleOrganizations = organizations.filter(({ organization }) => accessibleIds.has(organization.id));
      const selected = accessibleOrganizations.find(({ organization }) => organization.id === preferred)
        || accessibleOrganizations[0]
        || organizations.find(({ organization }) => organization.id === preferred)
        || organizations[0];
      if (selected.organization.id !== preferred) setSelectedOrganization(res, selected.organization.id);
      const access = farmContexts.find(({ organization }) => organization.id === selected.organization.id)
        || await geroCore.access(req, selected.organization.id);

      res.set("cache-control", "no-store");
      res.json({
        user: me,
        organizations: access.access.allowed ? accessibleOrganizations : organizations,
        selectedOrganizationId: selected.organization.id,
        access,
      });
    } catch (error) { next(error); }
  });

  app.post("/api/auth/select-organization", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const organizationId = z.string().uuid().parse(req.body?.organizationId);
      const organizations = await geroCore.organizations(req);
      if (!organizations.some(({ organization }) => organization.id === organizationId)) {
        throw new CoreApiError(404, "Organization not found", "ORGANIZATION_NOT_FOUND");
      }
      const access = await geroCore.access(req, organizationId);
      if (!access.access.allowed) throw new CoreApiError(403, "Application access denied", "ACCESS_DENIED");
      setSelectedOrganization(res, organizationId);
      res.status(204).end();
    } catch (error) { next(error); }
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      for (const cookie of await geroCore.logout(req)) res.append("set-cookie", cookie);
      res.status(204).end();
    } catch (error) { next(error); }
  });

  app.patch("/api/auth/locale", async (req, res, next) => {
    try {
      assertSameOrigin(req);
      const preferredLocale = z.enum(["pt-PT", "es"]).parse(req.body?.preferredLocale);
      const profile = await geroCore.updatePreferredLocale(req, preferredLocale);
      res.set("cache-control", "no-store");
      res.json({ preferredLocale: profile?.preferredLocale ?? preferredLocale });
    } catch (error) { next(error); }
  });

  app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found", code: "NOT_FOUND" }));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.set("cache-control", "no-store");
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid request", code: "VALIDATION_ERROR" });
    if (error instanceof CoreApiError) return res.status(error.status).json({ message: error.message, code: error.code });
    if (error instanceof RequestOriginError) return res.status(error.status).json({ message: error.message, code: "ORIGIN_REJECTED" });
    console.error("Unhandled GeroFarm request error", error);
    return res.status(503).json({ message: "GeroFarm is temporarily unavailable", code: "SERVICE_UNAVAILABLE" });
  });

  return app;
}
