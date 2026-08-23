import assert from "node:assert/strict";
import test from "node:test";
import { geroCore } from "./gero-core-client";

test("read requests forward only the shared session cookie", async () => {
  const originalFetch = globalThis.fetch;
  let forwardedCookie = "";
  globalThis.fetch = async (_input, init) => {
    forwardedCookie = new Headers(init?.headers).get("cookie") || "";
    return new Response(JSON.stringify({ data: { id: "user" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await geroCore.me({ headers: { cookie: "local=value; gero_session=shared-token; gero_csrf=private" } } as never);
    assert.equal(forwardedCookie, "gero_session=shared-token");
  } finally { globalThis.fetch = originalFetch; }
});

test("mutations forward only shared session and CSRF cookies", async () => {
  const originalFetch = globalThis.fetch;
  let headers = new Headers();
  globalThis.fetch = async (_input, init) => {
    headers = new Headers(init?.headers);
    return new Response(JSON.stringify({ data: { preferredLocale: "es" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await geroCore.updatePreferredLocale({ headers: { cookie: "unrelated=value; gero_session=session; gero_csrf=csrf-token" } } as never, "es");
    assert.equal(headers.get("cookie"), "gero_session=session; gero_csrf=csrf-token");
    assert.equal(headers.get("x-csrf-token"), "csrf-token");
  } finally { globalThis.fetch = originalFetch; }
});
