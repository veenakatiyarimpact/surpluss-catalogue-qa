// import { mkdir } from "node:fs/promises";
// import path from "node:path";
// import { test, expect } from "@playwright/test";
// import accounts from "../../testdata/surpluss-ui-test-data.json" with { type: "json" };

// const adminAccount = accounts.find((account) => account.username === "admin@catalogue.test");
// const storageStatePath = path.resolve("test-results/admin-storage-state.json");

// // Authenticate once and save the NextAuth cookie state for reuse by this spec.
// test.beforeAll(async ({ browser }) => {
// 	await mkdir(path.dirname(storageStatePath), { recursive: true });

// 	const context = await browser.newContext();
// 	try {
// 		const page = await context.newPage();
// 		await page.goto(adminAccount.url);
// 		await page.getByLabel("Email").fill(adminAccount.username);
// 		await page.getByLabel("Password").fill(adminAccount.password);
// 		await page.getByRole("button", { name: "Sign in" }).click();
// 		await expect(page.getByRole("link", { name: "Catalogues" })).toBeVisible({ timeout: 20_000 });
// 		await context.storageState({ path: storageStatePath });
// 	} finally {
// 		await context.close();
// 	}
// });

// test("reuses saved admin session to open catalogues", async ({ browser }) => {
// 	const context = await browser.newContext({ storageState: storageStatePath });
// 	try {
// 		const page = await context.newPage();
// 		await page.goto("/admin/catalogues");

// 		await expect(page.getByRole("heading", { name: "Catalogues", exact: true })).toBeVisible();
// 		await expect(page.getByRole("button", { name: /admin@catalogue\.test/ })).toBeVisible();
// 	} finally {
// 		await context.close();
// 	}
// });
