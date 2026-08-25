import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.patch("/api/auth/locale", { data: { preferredLocale: "pt-PT" } });
});

test("unified shell exposes organisation, breadcrumbs, profile and Gero switcher", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("main")).toBeVisible();
  if (test.info().project.name === "mobile") {
    await expect(page.locator(".gero-shell-mobile-context").getByText("Exploração Fixture", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByText("Exploração Fixture", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação da aplicação" }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: /O que precisa da sua atenção/ })).toBeVisible();
  await page.getByRole("button", { name: "Utilizador Local" }).click();
  await expect(page.getByRole("menuitem", { name: "Gerir perfil" })).toBeVisible();
  await page.keyboard.press("Escape");
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page.getByRole("dialog", { name: "GeroFarm" }).getByRole("button", { name: "Gero" }).click();
  } else {
    await page.getByRole("button", { name: "Gero" }).first().click();
  }
  await expect(page.getByRole("menuitem", { name: "Módulos" })).toBeVisible();
});

test("shell has no serious accessibility findings or viewport overflow", async ({ page }, testInfo) => {
  await page.goto("/app/operations");
  await expect(page.getByRole("main")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? "")), `${testInfo.project.name}: serious axe findings`).toEqual([]);
});

test("mobile navigation is a keyboard-safe drawer and controls meet 44px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only contract");
  await page.goto("/app");
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  const drawer = page.getByRole("dialog", { name: "GeroFarm" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  const undersized = await page.locator(".gero-app-layout button:visible, .gero-app-layout input:visible, .gero-app-layout select:visible").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { name: element.getAttribute("aria-label") || element.textContent?.trim(), width: rect.width, height: rect.height };
  }).filter((item) => item.width < 44 || item.height < 44));
  expect(undersized).toEqual([]);
});

test("mobile RTL keeps shell and drawer inside the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only contract");
  await page.request.patch("/api/auth/locale", { data: { preferredLocale: "ar" } });
  await page.goto("/app");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "فتح التنقل" }).click();
  await expect(page.getByRole("dialog", { name: "GeroFarm" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
