// import { test, expect } from "@playwright/test";
// import testData from "../../testdata/surpluss-test-data.json" with { type: "json" };
// import uiTestData from "../../testdata/surpluss-ui-test-data.json" with { type: "json" };
// import catalogueFixture from "../../testdata/surpluss-catalogue-test-data.json" with { type: "json" };

// // The UI account fixture stores staff first and admin second; use separate
// // browser contexts below so their authenticated sessions cannot be shared.
// const [staffAccount, adminAccount] = uiTestData;

// // Select a product assigned to the source catalogue fixture so the create
// // dialog can add a real, seeded product instead of creating an empty catalogue.
// const productFixture = testData.products.find(
// 	({ fixtureId }) => catalogueFixture.productIds.includes(fixtureId),
// );
// if (!productFixture) {
// 	throw new Error("No test product is configured for the source catalogue fixture.");
// }

// // Sign in through the real login form and wait for authenticated navigation
// // before attempting to use any admin portal page.
// async function signIn(page, account) {
// 	await page.goto(account.url);
// 	await page.getByLabel("Email").fill(account.username);
// 	await page.getByLabel("Password").fill(account.password);
// 	await page.getByRole("button", { name: "Sign in" }).click();
// 	await expect(page.getByRole("link", { name: "Catalogues" })).toBeVisible({ timeout: 20_000 });
// }

// // Fallback cleanup for failures before the test's explicit delete step. A live
// // catalogue is first moved back to draft because deletion actions require it.
// async function removeCatalogue(page, name) {
// 	// Match the specific test-created row so cleanup cannot affect seeded catalogues.
// 	const row = page.getByRole("row").filter({ hasText: name });
// 	// The test may have failed before creation; in that case there is nothing to clean up.
// 	if (!(await row.count())) return;

// 	// Open actions for this row only, avoiding similarly named catalogues elsewhere in the table.
// 	const options = row.getByRole("button", { name: "More options" });
// 	await options.click();
// 	// If the test stopped after publication, return this catalogue to Draft before cleanup.
// 	const moveToDraft = page.getByRole("menuitem", { name: "Move to draft" });
// 	if (await moveToDraft.count()) {
// 		await moveToDraft.click();
// 		// Wait for the state transition before reopening the refreshed row actions.
// 		await expect(row.getByText("Draft", { exact: true })).toBeVisible();
// 		await options.click();
// 	}

// 	// Confirm deletion in the modal, then verify the record disappears from the list.
// 	await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
// 	await page.getByRole("button", { name: "Delete catalogue" }).click();
// 	await expect(row).toHaveCount(0);
// }

// test("staff creates a catalogue and admin publishes then deletes it", async ({ browser }) => {
// 	test.setTimeout(90_000);
// 	// Unique names and slugs prevent collisions with seeded or previous test data.
// 	const catalogueName = `${catalogueFixture.name} role-test ${Date.now()}`;
// 	const catalogueSlug = `${catalogueFixture.slug}-role-test-${Date.now()}`;
// 	let staffContext;
// 	let adminContext;
// 	let adminPage;

// 	try {
// 		// Staff creates a catalogue containing one seeded product. Creation is
// 		// deliberately left in the default draft state, not published immediately.
// 		staffContext = await browser.newContext();
// 		const staffPage = await staffContext.newPage();
// 		await signIn(staffPage, staffAccount);
// 		await staffPage.getByRole("link", { name: "Catalogues" }).click();
// 		await staffPage.getByRole("button", { name: "New catalogue" }).click();

// 		await staffPage.getByLabel("Name *").fill(catalogueName);
// 		await staffPage.getByLabel("Link *").fill(catalogueSlug);
// 		await staffPage.getByRole("button", { name: "Proceed" }).click();

// 		const productOption = staffPage.getByRole("button", { name: productFixture.name });
// 		await expect(productOption).toBeVisible();
// 		await productOption.click();
// 		await staffPage.getByRole("button", { name: "Create catalogue" }).click();
// 		await expect(staffPage.getByRole("heading", { name: new RegExp(catalogueName) })).toBeVisible();
// 		// Confirm the newly created catalogue is still draft and that staff cannot
// 		// see the admin-only publish or delete controls on its detail page.
// 		await expect(staffPage.getByText("Draft", { exact: true })).toBeVisible();
// 		await expect(staffPage.getByRole("switch", { name: "Go live" })).toHaveCount(0);
// 		await expect(staffPage.getByRole("button", { name: "Delete catalogue" })).toHaveCount(0);
// 		await staffContext.close();

// 		// Use a fresh context to prove the admin role, rather than staff's session,
// 		// is what makes publication and deletion controls available.
// 		adminContext = await browser.newContext();
// 		adminPage = await adminContext.newPage();
// 		await signIn(adminPage, adminAccount);
// 		await adminPage.goto("/admin/catalogues");
// 		await expect(adminPage.getByRole("heading", { name: "Catalogues", exact: true })).toBeVisible();

// 		const row = adminPage.getByRole("row").filter({ hasText: catalogueName });
// 		await expect(row).toBeVisible();
// 		// Admin publishes the same catalogue and the list must report Live.
// 		await row.getByRole("button", { name: "More options" }).click();
// 		await adminPage.getByRole("menuitem", { name: "Go live" }).click();

// 		await expect(adminPage.getByText("Catalogue is live")).toBeVisible();
// 		await expect(row.getByText("Live", { exact: true })).toBeVisible();

// 		// Admin confirms deletion; absence of the row verifies it was removed from
// 		// the catalogue list, not merely hidden or changed back to draft.
// 		await row.getByRole("button", { name: "More options" }).click();
// 		await adminPage.getByRole("menuitem", { name: "Delete", exact: true }).click();
// 		await adminPage.getByRole("button", { name: "Delete catalogue" }).click();
// 		await expect(row).toHaveCount(0);
// 	} finally {
// 		// Always close the staff session. If an earlier assertion failed, remove
// 		// the test catalogue when possible so later runs start with clean data.
// 		if (staffContext) await staffContext.close();
// 		if (adminPage && adminContext) {
// 			await adminPage.goto("/admin/catalogues").catch(() => {});
// 			await removeCatalogue(adminPage, catalogueName).catch(() => {});
// 			await adminContext.close().catch(() => {});
// 		}
// 	}
// });

// test("admin creates, publishes, and deletes a catalogue", async ({ browser }) => {
// 	test.setTimeout(90_000);
// 	const catalogueName = `${catalogueFixture.name} admin-test ${Date.now()}`;
// 	const catalogueSlug = `${catalogueFixture.slug}-admin-test-${Date.now()}`;
// 	let context;
// 	let page;

// 	try {
// 		// Sign in as admin and open the catalogue creation workflow.
// 		context = await browser.newContext();
// 		page = await context.newPage();
// 		await signIn(page, adminAccount);
// 		await page.goto("/admin/catalogues");
// 		await expect(page.getByRole("heading", { name: "Catalogues", exact: true })).toBeVisible();
// 		await page.getByRole("button", { name: "New catalogue" }).click();

// 		// Create a draft containing a seeded product, then verify its initial status.
// 		await page.getByLabel("Name *").fill(catalogueName);
// 		await page.getByLabel("Link *").fill(catalogueSlug);
// 		await page.getByRole("button", { name: "Proceed" }).click();

// 		const productOption = page.getByRole("button", { name: productFixture.name });
// 		await expect(productOption).toBeVisible();
// 		await productOption.click();
// 		await page.getByRole("button", { name: "Create catalogue" }).click();
// 		await expect(page.getByRole("heading", { name: new RegExp(catalogueName) })).toBeVisible();
// 		await expect(page.getByText("Draft", { exact: true })).toBeVisible();

// 		// Admin should have the publish switch and delete action on the detail page.
// 		await expect(page.getByRole("switch", { name: "Draft" })).toBeVisible();
// 		await expect(page.getByRole("button", { name: "Delete catalogue" })).toBeVisible();

// 		// Publish from the catalogue list and verify the row's status changes to Live.
// 		await page.goto("/admin/catalogues");
// 		const row = page.getByRole("row").filter({ hasText: catalogueName });
// 		await expect(row).toBeVisible();
// 		await row.getByRole("button", { name: "More options" }).click();
// 		await page.getByRole("menuitem", { name: "Go live" }).click();
// 		await expect(page.getByText("Catalogue is live")).toBeVisible();
// 		await expect(row.getByText("Live", { exact: true })).toBeVisible();

// 		// Delete the published catalogue and verify it is removed from the list.
// 		await row.getByRole("button", { name: "More options" }).click();
// 		await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
// 		await page.getByRole("button", { name: "Delete catalogue" }).click();
// 		await expect(row).toHaveCount(0);
// 	} finally {
// 		// Clean up if the test fails before the explicit delete confirmation.
// 		if (page && context) {
// 			await page.goto("/admin/catalogues").catch(() => {});
// 			await removeCatalogue(page, catalogueName).catch(() => {});
// 			await context.close().catch(() => {});
// 		}
// 	}
// });
