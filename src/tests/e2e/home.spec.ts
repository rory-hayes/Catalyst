import { expect, test } from "@playwright/test";

test("home renders key dashboard sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Blueprint Home/i })).toBeVisible();
  await expect(page.getByText("Deals Needing Update")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Deals/i })).toBeVisible();
});
