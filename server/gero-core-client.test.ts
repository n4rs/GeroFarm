import assert from "node:assert/strict";
import test from "node:test";
import { CoreApiError, geroCore } from "./gero-core-client";

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

test("catalog and checkout stay authoritative in Gero Core", async () => {
  const originalFetch = globalThis.fetch; const calls: Array<{ url: string; method: string; body?: string }> = [];
  globalThis.fetch = async (input, init) => { const url=String(input),method=init?.method||"GET";calls.push({url,method,body:typeof init?.body==="string"?init.body:undefined});return new Response(JSON.stringify({data:method==="GET"?{plans:[],addons:[]}:{url:"https://checkout.example.test/session"}}),{status:200,headers:{"content-type":"application/json"}}); };
  try { await geroCore.catalog(); const result=await geroCore.checkout({headers:{cookie:"gero_session=session; gero_csrf=csrf"}} as never,"11111111-1111-4111-8111-111111111111",{kind:"addon",code:"virtual_station_1",billingPeriod:"monthly",quantity:2,successUrl:"https://farm.gero.pt/app",cancelUrl:"https://farm.gero.pt/app"});assert.equal(result?.url,"https://checkout.example.test/session");assert.match(calls[0].url,/billing\/catalog\/farm$/);assert.match(calls[1].url,/organizations\/11111111-1111-4111-8111-111111111111\/applications\/farm\/checkout$/);assert.equal(JSON.parse(calls[1].body!).quantity,2); }
  finally { globalThis.fetch=originalFetch; }
});

test("weather consumer uses only authenticated farm-scoped Gero Core v2 routes",async()=>{const originalFetch=globalThis.fetch;const calls:Array<{url:string;headers:Headers;method:string;body?:string}>=[];globalThis.fetch=async(input,init)=>{calls.push({url:String(input),headers:new Headers(init?.headers),method:init?.method||"GET",body:typeof init?.body==="string"?init.body:undefined});return new Response(JSON.stringify({data:[]}),{status:200,headers:{"content-type":"application/json"}})};try{const req={headers:{cookie:"unrelated=x; gero_session=session; gero_csrf=csrf"}} as never;await geroCore.weather.get(req,"11111111-1111-4111-8111-111111111111","stations");await geroCore.weather.post(req,"11111111-1111-4111-8111-111111111111","stations",{name:"North"});assert.match(calls[0].url,/\/organizations\/11111111-1111-4111-8111-111111111111\/applications\/farm\/weather\/stations$/);assert.equal(calls[0].headers.get("cookie"),"gero_session=session");assert.equal(calls[1].headers.get("cookie"),"gero_session=session; gero_csrf=csrf");assert.equal(calls[1].headers.get("x-csrf-token"),"csrf");assert.equal(calls[1].method,"POST");assert.doesNotMatch(calls.map((item)=>item.url).join("\n"),/pirate|weather-provider/i)}finally{globalThis.fetch=originalFetch}});

test("weather proxy preserves actionable Core 422 and 429 statuses", async () => {
  const originalFetch = globalThis.fetch;
  const statuses = [429, 422];
  globalThis.fetch = async () => {
    const status = statuses.shift()!;
    return new Response(
      JSON.stringify({ error: { code: `CORE_${status}`, message: "Core" } }),
      { status, headers: { "content-type": "application/json" } },
    );
  };
  const req = {
    headers: { cookie: "gero_session=session; gero_csrf=csrf" },
  } as never;
  try {
    await assert.rejects(
      geroCore.weather.get(req, "11111111-1111-4111-8111-111111111111", "stations"),
      (error: unknown) =>
        error instanceof CoreApiError &&
        error.status === 429 &&
        error.code === "CORE_429",
    );
    await assert.rejects(
      geroCore.weather.post(req, "11111111-1111-4111-8111-111111111111", "stations", {}),
      (error: unknown) =>
        error instanceof CoreApiError &&
        error.status === 422 &&
        error.code === "CORE_422",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
