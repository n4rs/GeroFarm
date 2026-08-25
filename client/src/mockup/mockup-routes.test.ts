import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the obsolete demonstrator redirects to authenticated API-backed modules", async () => {
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../app/AppWorkspace.tsx", import.meta.url), "utf8");
  assert.match(app, /path === "\/mockup"[\s\S]*<ApplicationRedirect/u);
  assert.match(app, /window\.location\.replace\("\/app"\)/u);
  assert.doesNotMatch(app, /MockupWorkspace/u);
  assert.doesNotMatch(workspace, /href="\/mockup"|aria-label=\{common\.(?:search|notifications)\}/u);
  assert.match(workspace, /fetch\("\/api\/farm\/holdings"/u);
});
