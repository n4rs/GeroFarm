import { idempotentMutationPolicy } from "@shared/idempotency";

let installed = false;

export function idempotencyRequestHeaders(method: string, target: string, headers: HeadersInit | undefined, currentOrigin: string, createKey: () => string) {
  const result = new Headers(headers), url = new URL(target, currentOrigin);
  if (url.origin === currentOrigin && idempotentMutationPolicy(method, url.pathname) && !result.has("idempotency-key")) result.set("idempotency-key", createKey());
  return result;
}

export function installMutationIdempotency() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const method = (init?.method || request?.method || "GET").toUpperCase();
    const target = request?.url || String(input);
    const headers = idempotencyRequestHeaders(method, target, init?.headers || request?.headers, window.location.origin, () => crypto.randomUUID());
    if (headers.has("idempotency-key")) init = { ...init, headers };
    return original(input, init);
  };
}
