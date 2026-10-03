# Project Requirements and Technical Assessment

## Document Status

This is a source-derived baseline for the repository as inspected on 1 October 2026. It describes implemented behavior where verified, intended behavior where the code states a policy, and open questions where business decisions are not encoded. It is not a signed-off product specification. Security and quality observations are recorded separately from requirements so that existing defects are not mistaken for desired behavior.

## Executive Summary

Surpluss Catalogue is a business-to-business product catalogue and enquiry portal. Internal staff maintain a reusable product library, assemble and publish customer-facing catalogues, manage stock and product attributes, and process buyer enquiries as leads. Buyers browse a published catalogue, request quantities, and submit contact information; the workflow is explicitly an enquiry rather than checkout or order placement.

The application is a Next.js App Router web app using React, TypeScript, PostgreSQL, Prisma, and NextAuth credentials authentication. Optional integrations cover S3 image storage, CloudFront delivery, SES email, WATI WhatsApp, Mailchimp newsletters, Google Places city suggestions, and Google Tag Manager.

The highest-priority assurance areas are catalogue confidentiality/publication gates, authorization by role, quantity validation and stock consistency, and reliable capture of leads. Several concrete access-control and catalogue-state inconsistencies were found in the current source; see [Observed Risks](#observed-risks-and-quality-findings).

## Scope and Actors

| Actor | Intended capabilities |
| --- | --- |
| Anonymous buyer | View published, unexpired catalogues and visible listings; search/filter products; view product details; submit an enquiry; optionally subscribe to the newsletter. |
| Staff / sales | Sign in; manage products and imports; create and maintain catalogues/listings; manage leads, statuses, and internal notes; use reporting/dashboard functions. |
| Admin | All staff capabilities, plus publish catalogues and delete catalogues. The source explicitly describes publication and deletion as admin-only because publication exposes pricing and deletion can destroy lead history. |
| Operator / deployer | Configure the database, authentication secret, and optional integrations; run migrations and seed data; provision and maintain internal accounts. Production account-provisioning workflow is not present in the inspected UI/API routes. |

The admin/staff distinction is represented in the data model and session. Enforcement is inconsistent in the current implementation; intended authorization above is not a claim that every handler currently enforces it.

## Functional Requirements

Priority meanings: **P0** protects confidentiality, authorization, or critical data integrity; **P1** is core product workflow; **P2** is supporting or optional capability. These priorities are an assessment, not values declared by the application.

### Buyer Experience

| ID | Priority | Requirement |
| --- | --- | --- |
| PUB-01 | P0 | A public catalogue page must serve only catalogues in the published state whose expiry is absent or has not passed. Draft and expired catalogue pricing/details must not be exposed through pages or APIs. |
| PUB-02 | P1 | Buyers can browse visible catalogue listings in configured display order, with product images, name, SKU, brand/category, description, badges, attributes, MOQ, stock, and price or a price-on-request state. |
| PUB-03 | P1 | Buyers can search catalogue products by name, SKU, brand, or category and use the available catalogue filtering and sorting controls. |
| PUB-04 | P1 | Buyers can open a product detail view, inspect its images and information, and initiate a supplier enquiry. |
| PUB-05 | P1 | An enquiry must contain a buyer name and at least one usable contact method (phone or email), and at least one requested product. Optional company, location, message, referral contact, and country code are accepted. |
| PUB-06 | P0 | Every requested product must belong to the submitted catalogue, be visible, and have a requested whole-number quantity at least its MOQ and no greater than available stock. Invalid or unavailable items must not create an enquiry. |
| PUB-07 | P1 | Successful enquiry submission stores a durable lead and item-level snapshots of product name, SKU, brand, price, and requested quantity, then returns a reference for follow-up. |
| PUB-08 | P1 | Enquiry is a lead/contact request, not an order, payment, stock reservation, or automatic stock deduction. Whether reservation is wanted is a business question, not current behavior. |
| PUB-09 | P2 | Buyers can submit a valid email to the newsletter endpoint when Mailchimp is configured. A honeypot submission should appear successful to bots without subscribing them. |
| PUB-10 | P2 | Public pages expose contact/WhatsApp calls to action and suitable share/social metadata. Expired catalogues provide a closed-campaign state rather than stale pricing. |

### Catalogue and Product Operations

| ID | Priority | Requirement |
| --- | --- | --- |
| ADM-01 | P1 | Authenticated staff can create catalogues with a name, unique URL slug, description, category, optional validity date, banners, and selected products. |
| ADM-02 | P0 | Only an admin can make a catalogue public or delete one. The UI and server-side actions/APIs must enforce the same role policy; hiding a control is not sufficient. |
| ADM-03 | P0 | Before publication, every included sale-priced product must have the required prices and positive stock. Price-on-request products follow the explicit price-on-request rules rather than requiring an offer price. |
| ADM-04 | P1 | Staff can edit catalogue metadata, banners, expiry, listing membership, listing visibility, order, and listing badges; a catalogue can contain reusable products without duplicating product records. |
| ADM-05 | P1 | An administrator can configure up to three promotional banners and listings can show up to three badges. Reusable badge presets may be created, edited, deleted, and applied to listings. |
| ADM-06 | P1 | Staff can create and edit products with unique SKU, name, optional brand/category/description, prices, price-on-request flag, MOQ, images, attributes, and stock. Inputs require server-side validation. |
| ADM-07 | P1 | Product library prices are shared across catalogues. A price change must therefore update all live catalogue views that include the product. |
| ADM-08 | P1 | Product stock can be flat or split by city. For products with city stock rows, total product quantity equals the sum of per-city quantities and writes keep both representations synchronized transactionally. |
| ADM-09 | P1 | Staff can import product rows from a mapped file/sheet, validate input, choose whether existing SKUs are updated, and see created/updated/skipped results. A failed database import must not leave a partial batch. |
| ADM-10 | P1 | Imports must preserve existing city-level stock, avoid erasing stored values when input cells are blank, and must not silently restore archived products. |
| ADM-11 | P1 | Archiving a product removes its catalogue listings; restoring it returns it to the product library unlisted. Archive/restore must not erase historical enquiry snapshots. |
| ADM-12 | P1 | Staff can view leads, open a lead by reference, change its status among new/contacted/qualified/won/lost/spam, and save private internal notes. |
| ADM-13 | P1 | Catalogue deletion must preserve lead history. Where enquiries exist, the operation should be blocked with an actionable explanation; moving the catalogue to draft is the supported alternative in the current UI. |
| ADM-14 | P2 | Admin dashboard provides catalogue/product/lead summary information, enquiry trend, and recent leads. Settings provide an at-a-glance view of selected integration configuration. |

### Authentication, API, and Operations

| ID | Priority | Requirement |
| --- | --- | --- |
| SEC-01 | P0 | Admin pages, APIs, server actions, and upload signing must require a valid authenticated session. Each mutation must independently authorize the actor's role and validate all input on the server. |
| SEC-02 | P0 | Draft, expired, and otherwise non-public catalogue data—including product identifiers, names, SKUs, and prices—must not leak from public search or enquiry APIs. |
| SEC-03 | P1 | Passwords are stored as password hashes, not plaintext. Session lifetime and credential validation must be explicit and suitable for internal accounts. |
| OPS-01 | P1 | PostgreSQL is the durable application store; Prisma migrations define its schema. Development setup must support migration and deterministic seed operations. |
| OPS-02 | P1 | Optional external-service credentials are server-side environment variables. Missing optional services should degrade gracefully and must not disclose secrets in API errors. |
| OPS-03 | P1 | Image uploads use short-lived presigned S3 PUT URLs, accept only configured image MIME types, and return a public delivery URL when CloudFront is configured. |
| OPS-04 | P2 | City entry supports Google Places suggestions when configured and manual entry when it is not. |
| OPS-05 | P2 | Analytics is only loaded when a GTM container ID is configured. Health endpoint provides a basic service probe. |

## Business Rules and Data Model

- A catalogue has a unique slug, currency (INR by default), status (draft/published/inactive/expired), optional expiry, optional notification number, banners, and related listings.
- A product is library-level and keyed by a unique SKU. It has shared pricing and one of two pricing modes: explicit MRP/offer price or price on request. MOQ defaults to one; quantity defaults to zero.
- A catalogue listing joins one product to one catalogue. The pair is unique; visibility, display order, and badges belong to the listing, not the product.
- Catalogue status has legacy values. The source helper intends legacy inactive/expired records to display as draft and a published catalogue whose validity has passed to display as expired. Its expiry comparison is currently wrong (see risk finding).
- Product stock may be represented by city rows keyed by a Google Places ID or a manual ID. The product quantity is maintained as a derived sum while city rows exist.
- Product archive is a soft-retirement marker. Archiving removes listings; restoring does not automatically relist the item.
- An enquiry belongs to a catalogue and has a unique reference, buyer contact details, optional referral/message, status, notes, and one or more item rows.
- Enquiry items retain product name/SKU/brand/unit-price snapshots and can detach from a removed listing. This makes lead history resilient to subsequent catalogue/product changes.
- Attribute definitions can be associated with a reusable template or a catalogue and support text, number, date, single-select, and multi-select types.
- Import jobs retain the file name, column mapping, row counts, and status/error metadata.
- Admin users have admin or staff roles. Seed data includes local-only admin and staff credentials; see [Local Setup](#local-setup-and-commands).

## Routes and Interfaces

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Public company/about page and contact calls to action. |
| `/catalogue/[slug]` | Public catalogue browsing/search/filtering. |
| `/catalogue/[slug]/product/[productId]` | Public product details and enquiry actions. |
| `/login` | Credentials sign-in. |
| `/admin` | Internal dashboard. |
| `/admin/catalogues`, `/admin/catalogues/[id]` | Catalogue list and catalogue editing/detail workflows. |
| `/admin/products` | Product library, price/stock/category editing and import workflow. |
| `/admin/leads`, `/admin/leads/[reference]` | Lead list and lead detail/status/notes. |
| `/admin/settings` | Selected integration configuration indicators. |
| `/admin/import` | Redirects to `/admin/products`. |

### API Endpoints

| Method and path | Purpose / access |
| --- | --- |
| `GET /api/health` | Basic health endpoint. |
| `GET/POST /api/auth/[...nextauth]` | NextAuth handlers. |
| `GET /api/catalogues/[slug]/search` | Public catalogue product search; must enforce public catalogue state. |
| `POST /api/enquiries` | Public lead submission and item/quantity validation. |
| `POST /api/newsletter` | Newsletter subscription via Mailchimp. |
| `POST /api/uploads/presign` | Authenticated request for an S3 upload URL. |
| `GET /api/admin/search` | Authenticated admin portal search. |
| `GET /api/admin/categories` | Authenticated category lookup. |
| `GET /api/admin/products/search` | Authenticated product search. |
| `GET /api/admin/places/cities` | Authenticated city suggestion/lookup. |
| `GET /api/admin/catalogues/slug-check` | Authenticated slug availability check. |
| `GET/PATCH /api/admin/catalogues/[id]` | Read/update a catalogue. Current handler checks authentication but not admin role. |
| `POST /api/admin/catalogues/[id]/listings` | Add a product listing. |
| `PATCH/DELETE /api/admin/catalogues/[id]/listings/[listingId]` | Update/remove a listing. Current handler does not scope mutation by parent catalogue ID. |
| `PUT /api/admin/catalogues/[id]/listings/order` | Reorder catalogue listings. |
| `GET/POST /api/admin/badge-presets` | List/create badge presets. |
| `PATCH/DELETE /api/admin/badge-presets/[id]` | Update/delete a badge preset. |

Product, lead, stock, and import mutations are also exposed as Next.js server actions rather than standalone REST endpoints. The authoritative implementations are under `src/app/admin/**/actions.ts` and product import actions.

## External Services and Configuration

| Service | Environment variables | Behavior when missing |
| --- | --- | --- |
| PostgreSQL / Prisma | `DATABASE_URL`, `DIRECT_URL` | Core application cannot operate without a database connection. |
| NextAuth | `AUTH_SECRET`, `NEXTAUTH_URL` | Required for secure sign-in/session behavior. |
| Application URL | `APP_URL` | Used for canonical metadata and notification links. |
| S3 and CloudFront | `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PREFIX`, `AWS_CLOUDFRONT_URL` | Upload presign returns 503 if bucket is not configured; public URL depends on CloudFront configuration. |
| Amazon SES | `SES_FROM_EMAIL`, `SES_TEAM_EMAIL`, AWS region | Email alerting is skipped/unavailable if credentials/configuration are absent. |
| WATI WhatsApp | `WATI_API_URL`, `WATI_API_TOKEN`, `WATI_ENQUIRY_TEMPLATE`, `WATI_TEAM_NUMBER`, `WATI_WHATSAPP_NUMBER` | WhatsApp notifications are skipped if not configured; catalogue-level notification number can override the recipient. |
| Mailchimp | `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX` | Newsletter endpoint returns unavailable when configuration is incomplete. |
| Google Places | `GOOGLE_MAPS_API_KEY` | City suggestions fall back to manual entry. |
| Google Tag Manager | `NEXT_PUBLIC_GTM_ID` | Analytics is not loaded. |

The settings page currently reports database, SES, WATI, and S3/CloudFront configuration only; it does not report Mailchimp, Places, or GTM, nor does it prove a configured integration is reachable.

## Local Setup and Commands

The repository includes `.env.example`, `docker-compose.yml`, and `package-lock.json`. Copy `.env.example` to `.env`; the sample database settings match the PostgreSQL container exposed on host port 5544. The app itself runs on port 3001. Optional integrations can remain unset for local development.

Typical PowerShell setup from the repository root:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

The seed step is for disposable local data only. Stop the development server with `Ctrl+C`; stop the local database with `docker compose down` when it is no longer needed. Do not remove the database volume unless you intend to discard its data.

Useful package scripts from `package.json`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate Prisma client and run Next dev server on port 3001. |
| `npm run build` / `npm start` | Production build / serve on port 3001. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Generate Prisma client and Next types, then run TypeScript checking. |
| `npm test` / `npm run test:watch` | Run/watch Vitest. |
| `npm run test:e2e` | Run Playwright tests against the app at port 3001. |
| `npm run db:generate` | Generate Prisma client. |
| `npm run db:migrate` / `npm run db:deploy` | Create development migration / deploy existing migrations. |
| `npm run db:seed` | Seed local example records and users. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run db:reset` | Destructively reset the database and reseed via Prisma behavior. Use only against a disposable local database. |

The seed provisions `admin@catalogue.test` / `Admin#2026` and `staff@catalogue.test` / `Staff#2026`, plus example live, draft/confidential, and expired catalogues, products, stock/listings, and leads. These are for a disposable local database only. The seed upserts and resets those credentials, so it must not be run against a production database.

The schema is managed by Prisma and PostgreSQL; the checked-in migration history contains 14 migration directories. The schema includes catalogues, products, city stock, listings, badge presets, attribute templates/definitions, enquiries/items, import jobs, and admin users.

## Architecture and Repository Map

### Technology Baseline

| Area | Repository baseline |
| --- | --- |
| Application | Private npm package `surpluss-catalogue-qa`, version `0.1.0`; Next.js `16.3.0` App Router, React/React DOM `19.2.4`, TypeScript `5.x`. |
| Styling and UI | Tailwind CSS `4.x`, Base UI, Radix UI, shadcn components, Lucide/Tabler icons, and Motion. |
| Data and identity | PostgreSQL `17` in the supplied local Compose configuration; Prisma `7.9.x`; NextAuth `5.0.0-beta.32` credentials provider and JWT sessions. |
| Validation and forms | Zod `4.x`, React Hook Form `7.x`, and resolver integration. |
| Testing and quality | Vitest `4.x`, Playwright `1.56.x`, ESLint `9.x`; no checked-in test specs were found. |
| Product-facing utilities | Papa Parse for CSV handling, Recharts for dashboard charts, dnd-kit for drag-and-drop, TipTap for rich text, AWS SDK for S3/SES. |

- `src/app/`: Next.js App Router public pages, admin pages, API route handlers, and server actions.
- `src/components/`: shared UI and public/admin feature components.
- `src/lib/`: Prisma access, domain helpers, schemas, authentication support, pricing, catalogue queries, notifications, CSV/import logic, analytics, and integration clients.
- `src/auth.ts`, `src/auth-guards.ts`, `src/proxy.ts`: credentials authentication, session/role helpers, and route gating.
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`: relational schema, migrations, and development data.
- `tests/`, `e2e/`: intended Vitest and Playwright test locations; currently only `.gitkeep` placeholders are present.
- `AGENTS.md`: repository-specific instruction to read the installed Next.js documentation before changing application code because this repository's Next version/conventions may differ from familiar defaults.

Key implementation references: [Prisma schema](prisma/schema.prisma), [auth configuration](src/auth.ts), [catalogue query layer](src/lib/catalogue-queries.ts), [enquiry API](src/app/api/enquiries/route.ts), [product actions](src/app/admin/products/actions.ts), and [import actions](src/app/admin/products/import-actions.ts).

## Observed Risks and Quality Findings

These are code-review observations, not accepted product behavior. The tests described below are not currently present.

### RISK-01: Staff role can reach admin-only catalogue operations (P0)

The stated policy is that only admins publish or delete catalogues. However, `createCatalogueWithProducts` accepts a `publish` flag after checking only for a session; `deleteCatalogue` likewise checks authentication but not role. `PATCH /api/admin/catalogues/[id]` checks only authentication and accepts status updates. A staff account can therefore perform operations that expose pricing publicly or remove catalogue data. Add a shared role guard at every server-action and API mutation boundary, and test direct calls as staff and admin.

Evidence: [catalogue actions](src/app/admin/catalogues/actions.ts), [admin actions](src/app/admin/actions.ts), [catalogue API](src/app/api/admin/catalogues/[id]/route.ts), [role helper](src/auth-guards.ts).

### RISK-02: Admin-facing effective expiry is reversed (P1)

`effectiveStatus` marks a published catalogue as expired when `expiresAt` is in the future. The public catalogue query uses the expected past-date comparison, so admin display/status logic can disagree with actual public behavior. Correct the comparison and add boundary tests for no expiry, future expiry, exact boundary, and past expiry.

Evidence: [catalogue status helper](src/lib/catalogue-status.ts), [public catalogue query](src/lib/catalogue-queries.ts).

### RISK-03: Public search returns listings for non-public catalogues (P0)

`GET /api/catalogues/[slug]/search` fetches catalogue status and expiry but does not enforce either before returning visible product IDs, names, SKUs, and offer prices. The seed includes a draft catalogue explicitly described as confidential, making this a concrete confidentiality concern. Enforce published and unexpired state before querying/returning products; verify all public search responses for draft, expired, and live fixtures.

Evidence: [public search route](src/app/api/catalogues/[slug]/search/route.ts), [seed scenarios](prisma/seed.ts).

### RISK-04: Enquiry endpoint does not enforce catalogue publication/expiry (P0)

`POST /api/enquiries` validates that requested products are visible listings in the submitted catalogue and checks MOQ/quantity, but it does not check that the catalogue is published or unexpired. Direct API calls may create leads against draft or expired pricing even if the page itself is unavailable. Require the same public-state check used by catalogue rendering before accepting the enquiry.

Evidence: [enquiry route](src/app/api/enquiries/route.ts), [catalogue query](src/lib/catalogue-queries.ts).

### RISK-05: Listing mutation does not bind listing to URL catalogue (P1)

Nested `PATCH` and `DELETE /api/admin/catalogues/[id]/listings/[listingId]` use the listing ID as the mutation predicate but omit the parent `catalogueId`. An authenticated caller can address a listing belonging to another catalogue and mutate/delete it while passing a different valid catalogue ID in the URL. Include both IDs in the mutation predicate and test mismatched-parent IDs.

Evidence: [listing mutation route](src/app/api/admin/catalogues/[id]/listings/[listingId]/route.ts).

### RISK-06: Enquiry reference can collide (P1)

References are formed from the last seven digits of `Date.now()` while the database enforces uniqueness. Concurrent requests or sufficiently close requests can collide; the endpoint then returns a generic save failure and loses the attempted enquiry. Use a collision-resistant reference and test concurrent creation/error handling.

Evidence: [enquiry route](src/app/api/enquiries/route.ts), [schema](prisma/schema.prisma).

### RISK-07: Upload signature trusts declared type and has no size bound here (P2)

The presign route restricts the declared MIME type to JPEG/PNG/WebP and generates a five-minute URL, but it does not validate file contents or impose a size constraint in the signing request. A caller can potentially upload content inconsistent with the declared type or oversized files if bucket policy does not constrain them. Validate size/type at an upload boundary and/or enforce bucket policy; verify downstream image serving behavior.

Evidence: [upload presign route](src/app/api/uploads/presign/route.ts).

### RISK-08: Seed command resets known local passwords (P1 operational)

The seed upserts fixed local-only accounts and re-hashes known passwords on each run. This is documented as disposable-local behavior in code, but would reset credentials if executed against another database. Guard the seed for non-production use and keep production provisioning separate.

Evidence: [seed script](prisma/seed.ts).

### RISK-09: Notification delivery has no durable retry path verified (P2)

The enquiry is stored before notifications are scheduled. The notification integrations are optional and failure handling is log-based in the inspected code; no durable notification queue/retry was found. Lead persistence remains the primary record, but the sales team may not be alerted when providers fail. Decide whether operational monitoring or retries are required.

Evidence: [enquiry route](src/app/api/enquiries/route.ts), [notification module](src/lib/notifications.ts).

### Additional Gaps

- No checked-in Vitest or Playwright specs were found. The configured Vitest option `passWithNoTests: true` allows an empty suite to appear successful once dependencies are available.
- The configured test command was attempted during this assessment but could not execute: Windows reported `'vitest' is not recognized as an internal or external command`. Dependencies need to be installed before test results can be obtained.
- No user/account management page or API was found. Production account creation, role changes, password resets, and account disabling remain operationally unspecified.
- Public enquiry and newsletter routes have no application-level rate limit visible in source. Infrastructure-level protections were not assessed.
- The Settings page reports only a subset of integrations and checks environment-variable presence rather than provider connectivity.
- No README is present in the repository root, although a seed-script comment refers to credentials being published in a README. Setup is primarily described by `.env.example` and package scripts.
- No live runtime, database-backed behavior, accessibility audit, browser compatibility, load, or deployment infrastructure was tested as part of this static assessment.

## Assumptions and Open Questions

1. Are staff explicitly allowed to create catalogues and edit a published catalogue's other metadata/listings, or should any edit to a live catalogue require admin approval?
2. Should expired catalogues be completely inaccessible to enquiry APIs, or may the application accept a request that is clearly marked as a stale-campaign lead?
3. Is enquiry quantity only an expression of interest, or should stock be reserved/deducted after submission? Current behavior does not reserve stock.
4. Are there contractual requirements for retention, deletion, or export of buyer personal data and internal lead notes?
5. Should the app enforce rate limits, CAPTCHA/bot checks, email/phone verification, or consent capture for public enquiry/newsletter endpoints?
6. What is the supported production process for provisioning, rotating, and disabling admin/staff accounts?
7. Which optional integrations are required in each environment, and should Settings include delivery/health checks rather than configuration presence alone?
8. Should image size/content be verified during upload, and are image transformations or malware scanning required?
9. What availability, backup/restore, monitoring, notification delivery, and recovery objectives apply in production?
10. Are currency and locale intended to be fixed to INR/en-IN, or should catalogue-level currency and localization be fully surfaced to buyers?

## Recommended Verification Baseline

Before release, establish automated tests for:

- Role matrix for every admin route, server action, and mutating API (anonymous, staff, admin).
- Catalogue state visibility across page render, product/search APIs, and enquiry submission (draft, live, expired, missing expiry).
- Expiry boundary behavior and consistency between admin status and public access.
- Enquiry validation, duplicate products, unavailable listings, MOQ/stock limits, snapshot persistence, and simultaneous submissions.
- Listing ownership enforcement for mismatched parent/listing IDs.
- Product stock transaction invariants, city-row totals, imports with blank fields, archive/restore, and price-on-request cases.
- Upload authorization, MIME/size constraints, and graceful missing-configuration responses.
- Newsletter honeypot and provider failure behavior; notification success/failure observability.
- Essential public buyer journey and internal catalogue-to-lead workflow in Playwright.

Also add CI gates for typecheck, lint, unit tests, and an appropriate migration/build check. Ensure the test suite contains actual specs before relying on its exit status.