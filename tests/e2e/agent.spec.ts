import { expect, test } from "@playwright/test";

test.describe("Agente", () => {
  test("rota privada redireciona para entrar", async ({ page }) => {
    await page.goto("/agente");
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("compositor visível após login manual", async ({ page, isMobile }) => {
    test.skip(
      !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
      "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para o fluxo autenticado.",
    );

    await page.goto("/entrar");
    await page.getByLabel(/e-mail/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard|\/lojas|\/agente/);

    await page.goto("/agente");
    await expect(page.getByRole("heading", { name: /agente/i })).toBeVisible();
    await expect(page.getByText(/saúde comercial/i)).toBeVisible();

    const modeTrigger = page.getByRole("combobox").first();
    await modeTrigger.click();
    await page.getByRole("option", { name: /plan/i }).click();
    await expect(modeTrigger).toContainText(/plan/i);

    if (isMobile) {
      await expect(page.getByPlaceholder(/objetivo/i)).toBeVisible();
    }
  });
});
