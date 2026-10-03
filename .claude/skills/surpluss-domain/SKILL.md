---
name: surpluss-domain
description: "Surpluss Catalogue application domain knowledge: API endpoints, data models, business rules, UI selectors, seeded data, and user workflows. Use when writing tests, reviewing code, creating scenarios, or answering questions about the Surpluss app."
user-invocable: false
---

# Surpluss Catalogue Domain Knowledge

## Overview

Surpluss Catalogue is a B2B catalogue and buyer-enquiry portal. Staff maintain a shared product library and stock, assemble customer-facing catalogues, and process incoming enquiries as leads. Buyers browse published catalogues and submit an enquiry; the site does not take payment or place orders.

## Tech Stack

- **Application**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- **Data**: PostgreSQL 17 (local Compose), Prisma 7
- **Authentication**: NextAuth/Auth.js credentials provider, JWT-backed cookie sessions, scrypt password hashes
- **Validation**: Zod 4
- **Testing**: Vitest 4 and Playwright 1.56; Vitest supports JS/TS specs; Playwright uses Chromium
- **Optional integrations**: AWS S3/CloudFront, Amazon SES, WATI WhatsApp, Mailchimp, Google Places, Google Tag Manager

## Architecture

```text
src/app/                         Next App Router pages, APIs, server actions
├── api/                         REST-style route handlers
├── admin/                       Dashboard, catalogue, product, lead workflows
├── catalogue/[slug]/            Public catalogue and product pages
└── login/                       Internal credentials sign-in
src/components/                  Public and admin UI
src/lib/                         Domain queries, validation, imports, integrations
prisma/schema.prisma             PostgreSQL data model
prisma/migrations/               Ordered schema migrations
prisma/seed.ts                   Local sample data and accounts
tests/                           Vitest specs (including apiTests/ and bugs/)
e2e/                             Playwright specs
```

## Actors

- **Buyer**: anonymous; views published, unexpired catalogues and submits enquiries.
- **Staff**: signed-in sales user; manages products, catalogues/listings, and leads.
- **Admin**: staff capabilities plus catalogue publication and catalogue deletion by stated policy.

Important: role enforcement is inconsistent in the current implementation. Read `api-reference.md` and `business-rules.md` before assuming an endpoint enforces an admin-only policy.

## Data Model Summary

- **Catalogue**: unique slug, status (`draft`, `published`, `inactive`, `expired`), currency, optional expiry, banners, notification number.
- **Product**: unique SKU, shared product-level prices, price-on-request mode, flat quantity, MOQ, images, attributes, archive timestamp.
- **CatalogueListing**: catalogue/product join with visibility, display order, and inline badges.
- **City / ProductStock**: optional per-city inventory; product quantity is maintained as the sum of city stock rows.
- **Enquiry / EnquiryItem**: buyer lead and requested products; item rows preserve product name/SKU/brand/price snapshots.
- **BadgePreset**: reusable text/color presets; applying one copies values to a listing.
- **AttributeTemplate / AttributeDefinition**: reusable or catalogue-specific product attributes.
- **ImportJob**: product import metadata and row counts.
- **AdminUser**: internal account with `admin` or `staff` role and password hash.

## Detailed Knowledge

Load the relevant reference for the current task:

- **API paths, methods, payloads, auth, and error behavior** → `./api-reference.md`
- **Catalogue, product, stock, enquiry, authorization, and import rules** → `./business-rules.md`
- **Stable accessible names and UI locations for automation** → `./ui-selectors.md`
- **Buyer/admin workflows and local seeded data** → `./user-flows.md`

## Local Test Data

- Admin: `admin@catalogue.test` / `Admin#2026`
- Staff: `staff@catalogue.test` / `Staff#2026`
- Live catalogue: `/catalogue/premium-corporate-essentials`
- Draft catalogue: `/catalogue/festive-overstock-2026`
- Expired catalogue: `/catalogue/monsoon-clearance-2026`

These credentials and seed data are for disposable local development only. The seed upserts the accounts and resets their passwords.