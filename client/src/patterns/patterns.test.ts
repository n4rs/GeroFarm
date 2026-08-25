import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./patterns.tsx", import.meta.url), "utf8");
const overview = readFileSync(new URL("../app/OverviewDashboard.tsx", import.meta.url), "utf8");

test("shared UX patterns cover the approved asynchronous and mutation states", () => {
  for (const state of ["loading", "empty", "error", "permission-denied", "saving", "success"]) {
    assert.match(source, new RegExp(`\"${state}\"`));
  }
  assert.match(source, /export function (?:AsyncState|MutationFeedback|DataView|FormActions)/g);
});

test("the overview consumes the common asynchronous state pattern", () => {
  assert.match(overview, /import \{ AsyncState \} from "\.\.\/patterns"/);
  assert.match(overview, /<AsyncState state="loading"/);
  assert.match(overview, /<AsyncState state="empty"/);
  assert.match(overview, /<AsyncState state="error"/);
});
