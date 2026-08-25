import { createHash, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, lt } from "drizzle-orm";
import { idempotentMutationPolicy } from "@shared/idempotency";
import { idempotencyRequests } from "@shared/schema";
import type { FarmDatabase } from "./database";
import { withOrganizationTransaction } from "./database";
import type { FarmContextResolver } from "./farm-context";

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const lifetimeMs = 24 * 60 * 60 * 1000;
const replayableHeaderNames = new Set(["cache-control", "content-language", "content-type", "location"]);

type RequestIdentity = { method: string; path: string; requestHash: string };
type StoredResponse = { status: number; headers: Record<string, string>; body: unknown };
export type Reservation = { state: "new" | "mismatch" | "pending" } | ({ state: "completed" } & StoredResponse);

export interface IdempotencyStore {
  reserve(organizationId: string, key: string, request: RequestIdentity, now: Date): Promise<Reservation>;
  complete(organizationId: string, key: string, requestHash: string, response: StoredResponse): Promise<void>;
  release(organizationId: string, key: string, requestHash: string): Promise<void>;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function pathname(req: Pick<Request, "originalUrl">) {
  return new URL(req.originalUrl, "http://gerofarm.local").pathname;
}

export function requestFingerprint(req: Pick<Request, "method" | "originalUrl" | "body">) {
  return createHash("sha256").update(JSON.stringify({ method: req.method.toUpperCase(), path: pathname(req), body: canonical(req.body ?? null) })).digest("hex");
}

export function createPostgresIdempotencyStore(db: FarmDatabase): IdempotencyStore {
  return {
    async reserve(organizationId, key, request, now) {
      return withOrganizationTransaction(db, organizationId, async (tx) => {
        await tx.delete(idempotencyRequests).where(and(eq(idempotencyRequests.organizationId, organizationId), lt(idempotencyRequests.expiresAt, now)));
        const [created] = await tx.insert(idempotencyRequests).values({ id: randomUUID(), organizationId, key, method: request.method, path: request.path, requestHash: request.requestHash, status: "pending", expiresAt: new Date(now.getTime() + lifetimeMs) }).onConflictDoNothing({ target: [idempotencyRequests.organizationId, idempotencyRequests.key] }).returning();
        if (created) return { state: "new" as const };
        const [existing] = await tx.select().from(idempotencyRequests).where(and(eq(idempotencyRequests.organizationId, organizationId), eq(idempotencyRequests.key, key)));
        if (!existing || existing.requestHash !== request.requestHash || existing.method !== request.method || existing.path !== request.path) return { state: "mismatch" as const };
        if (existing.status === "completed" && existing.responseStatus !== null) return { state: "completed" as const, status: Number(existing.responseStatus), headers: existing.responseHeaders || {}, body: existing.responseBody };
        return { state: "pending" as const };
      });
    },
    async complete(organizationId, key, requestHash, response) {
      await withOrganizationTransaction(db, organizationId, async (tx) => {
        await tx.update(idempotencyRequests).set({ status: "completed", responseStatus: String(response.status), responseHeaders: response.headers, responseBody: response.body }).where(and(eq(idempotencyRequests.organizationId, organizationId), eq(idempotencyRequests.key, key), eq(idempotencyRequests.requestHash, requestHash), eq(idempotencyRequests.status, "pending")));
      });
    },
    async release(organizationId, key, requestHash) {
      await withOrganizationTransaction(db, organizationId, async (tx) => {
        await tx.delete(idempotencyRequests).where(and(eq(idempotencyRequests.organizationId, organizationId), eq(idempotencyRequests.key, key), eq(idempotencyRequests.requestHash, requestHash), eq(idempotencyRequests.status, "pending")));
      });
    },
  };
}

function responseHeaders(res: Response) {
  if (!res.getHeader("content-type")) res.type("json");
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(res.getHeaders())) {
    if (replayableHeaderNames.has(name) && typeof value === "string") headers[name] = value;
  }
  return headers;
}

export function idempotencyMiddleware(store: IdempotencyStore, resolveContext: FarmContextResolver) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = pathname(req);
    if (!idempotentMutationPolicy(req.method, path)) return next();
    try {
      const supplied = req.get("idempotency-key")?.trim();
      if (!supplied) {
        if (process.env.NODE_ENV === "production") return res.status(400).set("cache-control", "no-store").json({ message: "Idempotency-Key is required", code: "IDEMPOTENCY_KEY_REQUIRED" });
        return next();
      }
      if (!keyPattern.test(supplied)) return res.status(400).set("cache-control", "no-store").json({ message: "Invalid Idempotency-Key", code: "IDEMPOTENCY_KEY_INVALID" });
      const context = await resolveContext(req);
      const request = { method: req.method.toUpperCase(), path, requestHash: requestFingerprint(req) };
      const reservation = await store.reserve(context.organization.id, supplied, request, new Date());
      if (reservation.state === "mismatch") return res.status(409).set("cache-control", "no-store").json({ message: "Idempotency key was reused for another request", code: "IDEMPOTENCY_KEY_REUSED" });
      if (reservation.state === "pending") return res.status(409).set({ "cache-control": "no-store", "retry-after": "1" }).json({ message: "Request with this idempotency key is still running", code: "IDEMPOTENCY_REQUEST_IN_PROGRESS" });
      if (reservation.state === "completed") return res.status(reservation.status).set({ ...reservation.headers, "idempotency-replayed": "true" }).json(reservation.body);

      const originalJson = res.json.bind(res);
      let completing = false;
      res.json = ((body: unknown) => {
        if (completing) return originalJson(body);
        completing = true;
        const status = res.statusCode;
        const persistence = status >= 500
          ? store.release(context.organization.id, supplied, request.requestHash)
          : store.complete(context.organization.id, supplied, request.requestHash, { status, headers: responseHeaders(res), body });
        void persistence.then(() => originalJson(body)).catch(next);
        return res;
      }) as Response["json"];
      next();
    } catch (error) { next(error); }
  };
}
