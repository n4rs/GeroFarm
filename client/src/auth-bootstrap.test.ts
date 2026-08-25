import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapFetch, BootstrapRequestError } from "./auth-bootstrap";

const noWait = async () => undefined;

test("retries one transient response and returns the successful response", async () => {
  let calls = 0;
  const response = await bootstrapFetch("https://example.test/bootstrap", {}, {
    retryDelayMs: 0,
    waitImpl: noWait,
    fetchImpl: async () => new Response(null, { status: ++calls === 1 ? 503 : 204 }),
  });
  assert.equal(response.status, 204);
  assert.equal(calls, 2);
});

test("does not retry definitive access failures", async () => {
  let calls = 0;
  const response = await bootstrapFetch("https://example.test/bootstrap", {}, {
    waitImpl: noWait,
    fetchImpl: async () => { calls += 1; return new Response(null, { status: 403 }); },
  });
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
});

test("retries a network failure once", async () => {
  let calls = 0;
  const response = await bootstrapFetch("https://example.test/bootstrap", {}, {
    retryDelayMs: 0,
    waitImpl: noWait,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("network unavailable");
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("bounds a request that never completes", async () => {
  let calls = 0;
  await assert.rejects(
    bootstrapFetch("https://example.test/bootstrap", {}, {
      timeoutMs: 5,
      retryDelayMs: 0,
      waitImpl: noWait,
      fetchImpl: async (_input, init) => {
        calls += 1;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        });
      },
    }),
    (error: unknown) => error instanceof BootstrapRequestError && error.kind === "timeout",
  );
  assert.equal(calls, 2);
});

test("external cancellation stops without retrying", async () => {
  const controller = new AbortController();
  let calls = 0;
  const pending = bootstrapFetch("https://example.test/bootstrap", { signal: controller.signal }, {
    retryDelayMs: 0,
    waitImpl: noWait,
    fetchImpl: async (_input, init) => {
      calls += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    },
  });
  queueMicrotask(() => controller.abort());
  await assert.rejects(
    pending,
    (error: unknown) => error instanceof BootstrapRequestError && error.kind === "cancelled",
  );
  assert.equal(calls, 1);
});
