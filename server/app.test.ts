import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createApp } from "./app";

test("health endpoint identifies the farm application and disables caching", async () => {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok", application: "farm", version: "0.1.0" });
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("unknown API routes fail without falling through to the SPA", async () => {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/unknown`);
    assert.equal(response.status, 404);
    assert.equal((await response.json() as { code: string }).code, "NOT_FOUND");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("malformed and oversized JSON have stable client errors", async () => {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const base = `http://127.0.0.1:${address.port}`;
    const malformed = await fetch(`${base}/api/auth/select-organization`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    assert.equal(((await malformed.json()) as { code: string }).code, "MALFORMED_JSON");
    const oversized = await fetch(`${base}/api/auth/select-organization`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(300_000) }) });
    assert.equal(oversized.status, 413);
    assert.equal(((await oversized.json()) as { code: string }).code, "PAYLOAD_TOO_LARGE");
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});
