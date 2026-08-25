import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatLocalDate, formatLocalDateTime } from "./locale-format";

test("visible dates use the selected locale without shifting date-only values", () => {
  assert.equal(formatLocalDate("2026-08-25", "pt-PT"), "25/08/2026");
  assert.notEqual(formatLocalDate("2026-08-25", "ar"), formatLocalDate("2026-08-25", "pt-PT"));
  assert.doesNotMatch(formatLocalDateTime("2026-08-25T09:30:00.000Z", "en"), /^2026-08-25/u);
});

test("localized application views do not fall back to the browser default locale", () => {
  const files = [
    "client/src/app/crops/CropLifecyclePanel.tsx",
    "client/src/app/economics/EconomicsModule.tsx",
    "client/src/app/operations/IrrigationPanel.tsx",
    "client/src/app/operations/OperationsModule.tsx",
    "client/src/app/plans/PlansModule.tsx",
    "client/src/app/privacy/PrivacyModule.tsx",
    "client/src/app/resources/ResourcesModule.tsx",
    "client/src/app/weather/WeatherModule.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\.toLocale(?:Date)?String\(\)/u, `${file} must pass the selected locale`);
  }
});
