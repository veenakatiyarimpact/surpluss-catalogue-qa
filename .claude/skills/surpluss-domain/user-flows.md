# Surpluss Catalogue User Flows and Test Data

## Flow 1: Sign in to Admin

1. Open `/login`.
2. Enter the seeded staff or admin email and password.
3. Submit credentials; successful sign-in redirects to the protected admin area.
4. Anonymous access to `/admin/**` should redirect to sign-in. API handlers should return `401` when unauthenticated.

## Flow 2: Browse a Live Catalogue

1. Open `/catalogue/premium-corporate-essentials`.
2. Browse visible product cards and use search/filter/sort controls.
3. Open a product detail page and review price or price-on-request, stock, MOQ, images, and attributes.
4. Draft catalogues should not expose product data. Expired catalogues should show the expired state without stale pricing.

## Flow 3: Submit an Enquiry

1. Open a product from a live catalogue and choose a requested quantity.
2. Provide a buyer name and at least one contact method (phone or email).
3. Submit the enquiry.
4. The API validates catalogue/listing visibility, MOQ, and stock; returns a unique reference on success.
5. The saved lead and item snapshot appear in Admin Leads. Enquiry does not place an order, reserve stock, or collect payment.

## Flow 4: Manage Catalogues

1. Sign in and open Admin → Catalogues.
2. Create a catalogue with a unique slug and optionally select products, expiry, banners, and category.
3. Edit listing visibility/order/badges and catalogue details.
4. Publishing is intended to be admin-only and subject to product completeness rules.
5. Deletion is intended to be admin-only and is blocked when enquiries depend on the catalogue.
6. When writing security tests, call the route/action directly as staff; do not test only whether the UI hides an action.

## Flow 5: Manage Product Library and Inventory

1. Sign in and open Admin → Products.
2. Add/edit products or import rows by SKU.
3. Update price-on-request, MRP/offer price, MOQ, image URLs, and attributes.
4. Optionally assign stock to cities; product total should equal the sum of city quantities.
5. Archive removes catalogue listings; restore returns the product unlisted.
6. Imports should preserve located stock, skip archived SKUs, and avoid clearing fields for blank cells.

## Flow 6: Process Leads

1. Open Admin → Leads and search by reference, buyer, or contact.
2. Open the enquiry detail.
3. Change status among new/contacted/qualified/won/lost/spam and save internal notes.
4. Confirm product details and unit price reflect the snapshot at enquiry time, even if current product data changed.

## Seeded Local Data

Run `npm run db:deploy` then `npm run db:seed` against a disposable local database.

| Data | Value |
|---|---|
| Admin account | `admin@catalogue.test` / `Admin#2026` |
| Staff account | `staff@catalogue.test` / `Staff#2026` |
| Published catalogue | `premium-corporate-essentials` |
| Draft/private catalogue | `festive-overstock-2026` |
| Expired catalogue | `monsoon-clearance-2026` |
| Seed volume | 2 users, 3 catalogues, 8 products, 19 enquiries (at the current seed revision) |

The seed uses upserts and resets the local credentials; do not run it on production data. Product UUIDs are generated and should not be assumed stable. Stable SKU examples are defined in `src/lib/data.ts`.

## Automation Notes

- Use unique records for tests that write data and clean them up where possible.
- Keep tests for known current defects in a separately named bug/regression area if a deliberately red suite is not an acceptable CI gate.
- Use mocks for external providers; use a real disposable PostgreSQL instance for relational constraints, transactions, and migration coverage.
- Recommended core E2E: staff/admin sign-in, live catalogue management, buyer enquiry submission, and lead visibility. Include an authorization check that staff cannot perform admin-only publication/deletion.