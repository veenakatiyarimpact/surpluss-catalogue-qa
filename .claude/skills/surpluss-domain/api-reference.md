# Surpluss Catalogue API Reference

Authentication uses NextAuth cookie sessions, not bearer tokens. Admin page access is session-gated. Route-level API and action role checks are inconsistent; see the notes below and `business-rules.md`. Server actions are not REST endpoints, but are included in the action summary.

## Public and Authentication Routes

| Method | Endpoint | Request | Observed response / behavior |
|---|---|---|---|
| GET | `/api/health` | None | `200 { status: "ok" }`, `Cache-Control: no-store`. |
| GET, POST | `/api/auth/[...nextauth]` | Auth.js-defined | NextAuth credentials/session handlers; response contract is framework-managed. |
| GET | `/api/catalogues/[slug]/search?q=...` | `q`, trimmed length 1–120 | `{ ids, matches: [{ id, name, sku, offerPrice }] }`; bad query `400`, unknown slug `404`. **Current handler does not enforce published/unexpired state.** |
| POST | `/api/enquiries` | `catalogueId`, `name`, `items`; phone or email required. Optional company, countryCode, location, message, referralPerson. | `201 { ok: true, reference }`; invalid details/quantity `400`, unavailable listing `409`, save failure `500`. **Current handler does not enforce catalogue publication/expiry.** |
| POST | `/api/newsletter` | Valid email, source (`header`, `footer`, or `catalogue-bottom`); optional honeypot `company` | `{ ok: true, status }`; invalid `400`, missing Mailchimp config `503`, provider failure `502`. Filled honeypot gets success-shaped response without subscribing. |
| POST | `/api/uploads/presign` | `{ fileName, contentType, kind? }`; kinds: `product`, `catalogue-cover`, `catalogue-banner`; MIME: JPEG/PNG/WebP | `{ uploadUrl, key, publicUrl }`; anonymous `401`, invalid request `400`, missing storage/configuration or provider failure `503`. |

## Signed-in Admin Routes

All paths below are intended to require a session. Most handlers check session presence; do not infer role authorization unless a route explicitly checks it.

| Method | Endpoint | Request | Observed response / behavior |
|---|---|---|---|
| GET | `/api/admin/search?q=...` | Query 1–120 chars | `{ products, catalogues, leads }`, up to five results per group; anonymous `401`; invalid/missing query returns empty groups. |
| GET | `/api/admin/products/search` | Optional `query`, `catalogueId`, `cursor` | `{ products, nextCursor }`; archived products excluded; anonymous `401`, invalid query params `400`. |
| GET | `/api/admin/places/cities?q=...` | Query `q`, optional session token | Up to six suggestions; under two chars gives empty list; absent Places key/upstream failure indicated in a successful response; anonymous `401`. |
| GET | `/api/admin/categories?kind=...` | Optional `kind=product\|brand\|catalogue` | `{ categories }`; defaults to product categories; anonymous `401`. |
| GET | `/api/admin/catalogues/slug-check?slug=...` | Slug; optional `excludeId` UUID | `{ available: boolean }`; blank normalized slug returns false. |
| GET, PATCH | `/api/admin/catalogues/[id]` | PATCH validates catalogue edit DTO | GET catalogue DTO; PATCH `{ ok: true, catalogue }`; malformed ID/body `400`, not found `404`, duplicate slug/incomplete publication `409`. **PATCH currently checks session, not admin role.** |
| POST | `/api/admin/catalogues/[id]/listings` | `{ productIds: UUID[] }`, 1–500 | `201 { ok: true, added }`; invalid input `400`, catalogue not found `404`, incomplete products on published catalogue `409`. |
| PATCH, DELETE | `/api/admin/catalogues/[id]/listings/[listingId]` | PATCH `{ isVisible? , badges? }` with at least one field | `{ ok: true }`; invalid input/IDs `400`, not found `404`, failure `500`. **Current mutation filters only by listing ID, not parent catalogue ID.** |
| PUT | `/api/admin/catalogues/[id]/listings/order` | `{ orderedIds: UUID[] }` | `{ ok: true }`; IDs must belong to catalogue; invalid/mismatched order `400`, missing catalogue `404`. |
| GET, POST | `/api/admin/badge-presets` | POST `{ text, bg, fg }` | GET `{ presets }`; POST `201 { ok: true, preset }`; invalid `400`, duplicate text `409`, write failure `500`. |
| PATCH, DELETE | `/api/admin/badge-presets/[id]` | PATCH same badge fields; DELETE no body | `{ ok: true }`; invalid `400`, not found `404`, duplicate text `409`. Applied listing badges are inline copies and remain unchanged. |

## Server Actions (Not HTTP Routes)

- `src/app/admin/actions.ts`: `setCatalogueStatus`, `deleteCatalogue`, `logout`.
- `src/app/admin/catalogues/actions.ts`: create catalogue with products and update banners.
- `src/app/admin/products/actions.ts`: product create/edit/duplicate, price and stock updates, categories, archive/restore, deletion, and sale completeness.
- `src/app/admin/products/import-actions.ts`: check SKU collisions and import/update product batches.
- `src/app/admin/leads/actions.ts`: update lead status and save internal notes.

Server actions return action result objects, not HTTP statuses. Test them by calling exported functions with mocked auth/data boundaries or through the UI.

## High-value Error Scenarios

| Scenario | Expected behavior / status |
|---|---|
| Anonymous admin API access | `401 Unauthorized`; mutation/data layer should not be reached. |
| Staff attempts admin-only publish/delete | Deny (`403` or action error) before mutation. Current code has bypasses in multiple paths. |
| Public search on draft/expired catalogue | No product identifiers, names, SKUs, or prices returned. Current route does not enforce this. |
| Enquiry against draft/expired catalogue | Reject and persist no enquiry. Current route does not enforce this. |
| PATCH/DELETE listing ID under a different catalogue URL | `404`; listing must remain unchanged. Current mutation is not scoped to parent catalogue. |
| Quantity below MOQ or above stock | `400`; no enquiry persisted. |
| Presign missing session / unsupported MIME | `401` / `400`, respectively. |
| Database/provider failures | Do not leak secrets; public handlers return generic errors and log where configured. |

## References

Handlers live under `src/app/api/**/route.ts`; request schemas under `src/lib/schemas/`; auth setup is `src/auth.ts`; role helpers are in `src/auth-guards.ts`.