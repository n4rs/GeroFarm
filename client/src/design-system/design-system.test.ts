import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const components = readFileSync(new URL("./components.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./components.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

test("Gero Design System exposes the approved component catalogue", () => {
  for (const name of ["Button", "IconButton", "Input", "Select", "Checkbox", "Radio", "Switch", "Tabs", "Badge", "Tooltip", "Dropdown", "Modal", "Drawer", "Toast", "Card", "Table", "Pagination", "Breadcrumb", "PageHeader", "EmptyState", "Skeleton", "Alert", "Sidebar", "Topbar", "UserMenu", "AppSwitcher"]) {
    assert.match(components, new RegExp(`export (?:const|function|type) ${name}\\b`), name);
  }
});

test("interactive foundations use the 44 pixel control token and accessible overlays", () => {
  assert.match(tokens, /--gero-control-height:\s*2\.75rem/);
  assert.match(styles, /min-block-size:var\(--gero-control-height\)/);
  for (const contract of ['aria-modal="true"', "focusableSelector", 'event.key === "Escape"', 'event.key !== "Tab"', "restore.current.focus()"]) assert.ok(components.includes(contract), contract);
});

test("design system styling is token based and reduced-motion aware", () => {
  assert.match(styles, /@import "\.\/foundations\.css"/);
  assert.doesNotMatch(styles, /font-size:\s*(?:[7-9]|1[01])px/);
  assert.match(readFileSync(new URL("./foundations.css", import.meta.url), "utf8"), /prefers-reduced-motion/);
});
