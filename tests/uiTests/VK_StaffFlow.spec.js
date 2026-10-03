import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";
import accounts from "../../testdata/surpluss-ui-test-data.json" with { type: "json" };
import testData from "../../testdata/surpluss-test-data.json" with { type: "json" };
import catalogueFixture from "../../testdata/surpluss-catalogue-test-data.json" with { type: "json" };

const staffAccount = accounts.accounts.find(({ role }) => role === "staff");
const productFixture = testData.products.find(({ fixtureId }) =>
  catalogueFixture.productIds.includes(fixtureId),
);
const storageStatePath = path.resolve("test-results/staff-storage-state.json");

// Sign in with the local staff fixture once and save the NextAuth cookie state.
test.beforeAll(async ({ browser }) => {
  await mkdir(path.dirname(storageStatePath), { recursive: true });
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3001/login");
    await page.getByLabel("Email").fill(staffAccount.email);
    await page.getByLabel("Password").fill(staffAccount.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: "Catalogues" })).toBeVisible({ timeout: 20_000 });
    await context.storageState({ path: storageStatePath });
  } finally {
    await context.close();
  }
});

test("TestCase001 : reuses saved staff session and creates a draft catalogue", async ({ browser }) => {
  const catalogueName = `${catalogueFixture.name} staff-test ${Date.now()}`;
  const catalogueSlug = `${catalogueFixture.slug}-staff-test-${Date.now()}`;
  const context = await browser.newContext({ storageState: storageStatePath });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3001/admin/catalogues");

    await expect(page.getByRole("heading", { name: "Catalogues", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /staff@catalogue\.test/ })).toBeVisible();

    await page.getByRole("button", { name: "New catalogue" }).click();
    await page.getByLabel("Name *").fill(catalogueName);
    await page.getByLabel("Link *").fill(catalogueSlug);
    await page.getByRole("button", { name: "Proceed" }).click();

    const productOption = page.getByRole("button", { name: productFixture.name });
    await expect(productOption).toBeVisible();
    await productOption.click();
    await page.getByRole("button", { name: "Create catalogue" }).click();

    await expect(page.getByRole("heading", { name: new RegExp(catalogueName) })).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    const BASE_URL = "http://localhost:3001/admin/catalogues";
    const apiContext = await request.newContext();

   const response = await apiContext.post(url,{data:loginPayLoad});
   expect(loginResponse.ok()).toBeTruthy();
   const responseJson = await loginResponse.json();


  } finally {
    await context.close();
  }
});