import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const hosts = [
  ["cookie preferences", "../CookieConsentManager.tsx", 1],
  ["holding and field", "../app/farm/FarmHoldingsModule.tsx", 1],
  ["variety", "../app/crops/CropsModule.tsx", 1],
  ["crop lifecycle", "../app/crops/CropLifecyclePanel.tsx", 1],
  ["resources", "../app/resources/ResourcesModule.tsx", 1],
  ["inventory and costs", "../app/economics/EconomicsModule.tsx", 1],
  ["specialist, operation, catalogue and void", "../app/operations/OperationsModule.tsx", 4],
  ["irrigation", "../app/operations/IrrigationPanel.tsx", 1],
  ["plan editor and detail", "../app/plans/PlansModule.tsx", 2],
  ["weather station", "../app/weather/WeatherModule.tsx", 1],
  ["capacity entitlement", "../app/entitlements/EntitlementCenter.tsx", 1],
] as const;

test("every frontend dialog is routed through the shared accessible primitive", () => {
  for (const [name, path, expected] of hosts) {
    const source = read(path);
    assert.equal((source.match(/<AccessibleDialog\b/g) || []).length, expected, name);
    assert.doesNotMatch(source, /<section[^>]+aria-modal=["{]/, `${name} must not implement a private modal`);
    assert.doesNotMatch(source, /className="(?:modal-backdrop|dialog-backdrop|cookie-overlay|entitlement-backdrop)"/, `${name} must not implement a raw backdrop`);
  }
});

test("shared dialog contract covers naming, focus, keyboard, safe dismissal and errors", () => {
  const source = read("./AccessibleDialog.tsx");
  for (const contract of [
    'role={role}', 'aria-modal="true"', 'aria-labelledby={labelledBy}', 'tabIndex={-1}',
    "data-dialog-initial-focus", 'event.key === "Escape"', "!busy", 'event.key !== "Tab"',
    "event.shiftKey", "last.focus()", "first.focus()", "restore?.isConnected", "restore.focus()",
    "event.target === event.currentTarget", 'role="alert"', 'aria-live="assertive"',
  ]) assert.ok(source.includes(contract), contract);
});

test("every shared dialog instance supplies an accessible close control", () => {
  for (const [name, path, expected] of hosts) {
    const source = read(path);
    assert.ok((source.match(/data-dialog-close/g) || []).length >= Math.min(expected, 1), name);
    for (const close of source.matchAll(/<button[^\n]*?data-dialog-close/g)) {
      const declaration = source.slice(close.index, close.index + 240);
      assert.match(declaration, /type="button"/, `${name} close button type`);
      assert.match(declaration, /aria-label=/, `${name} close button name`);
    }
  }
});
