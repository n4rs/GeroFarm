import assert from "node:assert/strict";
import test from "node:test";
import { isRouteVisible, pathForModule, routeManifest, routeModule } from "./route-manifest";

test("route manifest owns unique application paths and task groups", () => {
  assert.equal(routeManifest.length, 15);
  assert.equal(new Set(routeManifest.map((route) => route.id)).size, routeManifest.length);
  assert.equal(new Set(routeManifest.map((route) => route.path)).size, routeManifest.length);
  assert.deepEqual([...new Set(routeManifest.map((route) => route.group))], ["overview", "operation", "analysis", "management", "settings"]);
});

test("application routes resolve and preserve their public paths", () => {
  for (const route of routeManifest) {
    assert.equal(routeModule(route.path), route.id);
    assert.equal(routeModule(`${route.path}/`), route.id);
    assert.equal(pathForModule(route.id), route.path);
  }
  assert.equal(routeModule("/app/unknown"), "overview");
});

test("conditional routes use effective entitlement features", () => {
  const inventory = routeManifest.find((route) => route.id === "inventory")!;
  const weather = routeManifest.find((route) => route.id === "weather")!;
  assert.equal(isRouteVisible(inventory, {}), false);
  assert.equal(isRouteVisible(inventory, { inventory: true }), true);
  assert.equal(isRouteVisible(weather, { agronomicWeather: "history" }), true);
});
