# Surpluss Catalogue Business Rules

## 1. Catalogue Lifecycle and Visibility

- Catalogue slug is unique and used in the public URL.
- Only a `published` catalogue whose expiry is absent or not in the past should be publicly browsable or searchable.
- Draft catalogue content can include confidential, buyer-specific pricing; do not expose it through pages, search, or enquiry APIs.
- Expired catalogues show an expired notice instead of product/pricing data.
- Catalogue statuses in storage include `draft`, `published`, `inactive`, and `expired`; the edit form writes `draft` or `published`.
- A publication gate requires complete sale information for listed products. Price-on-request products follow their own rule; sale-priced products need prices and positive stock.
- Known defect: `effectiveStatus` currently uses an inverted expiry comparison. Public query behavior and status display can disagree.

## 2. Roles and Access

- Anonymous visitors can browse public catalogues and submit buyer enquiries.
- Signed-in staff work with products, catalogues, listings, and leads.
- Stated policy reserves catalogue publication and catalogue deletion to admins: publication exposes prices, and deletion can affect lead history.
- Every API route and server action must enforce permissions server-side, not only hide UI controls.
- Known gaps: create-with-publish, catalogue PATCH, and catalogue deletion have authentication checks without consistent admin-role enforcement. Listing delete is session-gated but not role-gated; confirm product policy before treating it as admin-only.
- Passwords are scrypt hashes. Sessions use JWT cookies, with configured maximum age of seven days.

## 3. Products and Pricing

- Product SKU is unique; product records are shared across catalogues.
- Catalogue-specific visibility, ordering, and badges belong to `CatalogueListing`; prices and stock belong to `Product`.
- Product name length is 2–70 characters. Prices are nonnegative monetary values with up to two decimal places.
- `priceOnRequest=true` means offer price is null and the public UI presents an enquiry-oriented price state.
- MOQ is a positive integer (default 1); quantity is a nonnegative integer (default 0).
- Images must be HTTPS URLs; product image list is limited to eight entries.
- A listing can have up to three badges. A catalogue can have up to three promotional banners.

## 4. Stock and Locations

- Products may have a simple total quantity or per-city stock rows.
- If per-city stock rows exist, `Product.quantity` is the sum of those rows and must be updated in the same transaction as stock changes.
- Flat quantity edits/imports must not silently override an existing per-city breakdown.
- City identity is keyed by Places `place_id`; manual fallback IDs are supported when Places is not configured.
- Enquiries validate requested quantity against MOQ and current stock but do not reserve or deduct stock. This is an enquiry workflow, not order fulfillment.

## 5. Enquiries and Lead History

- Enquiry requires a valid catalogue ID, buyer name, at least one item, and at least one contact method (phone or email).
- Item quantity must be a positive integer, at least MOQ, and no greater than product stock.
- Items must be visible listings in the selected catalogue.
- Enquiry item rows snapshot product name, SKU, brand, unit price, and requested quantity so history survives later price changes or listing removal.
- Lead statuses: `new`, `contacted`, `qualified`, `won`, `lost`, `spam`.
- Internal notes are limited to 4,000 characters.
- Deleting a catalogue with attached enquiry history should be blocked; use draft status to preserve historical leads.
- Known defect: enquiry references are generated from a short timestamp suffix and can collide under concurrent submissions.

## 6. Imports and Archive

- Product import uses SKU to find existing products and can optionally update them.
- Blank spreadsheet cells should not erase existing values.
- Imports preserve city-level stock and do not revive archived SKUs.
- Database writes for one import batch are transactional.
- Archiving is soft retirement and removes catalogue listings. Restoring returns a product to the library unlisted.

## 7. Integrations and Local Environment

- PostgreSQL local target: `localhost:5544`, database `catalogue`; Prisma migrations are in `prisma/migrations/`.
- Optional S3, SES, WATI, Mailchimp, Google Places, and GTM configuration is environment-based. Missing optional services should fail gracefully.
- Upload presigning accepts JPEG/PNG/WebP and requires sign-in. Current signing route does not set an explicit upload-size limit or inspect bytes; deployment bucket policy may add constraints.
- Enquiry persistence occurs before notification scheduling. Durable retry/notification guarantees are not specified by the current code.
- Seed users/passwords are local-only and the seed upserts/reset these credentials. Never seed a production database.

## 8. Test Priorities

1. Verify role matrix for every protected route/action, including direct calls bypassing UI.
2. Test publication/expiry consistently across page, search API, and enquiry API.
3. Verify listing ownership by catalogue ID, not only listing ID.
4. Test enquiry quantity limits, snapshots, duplicate submissions, and reference uniqueness.
5. Test per-city stock invariants, import rollback/blank-cell behavior, and archive/restore rules.