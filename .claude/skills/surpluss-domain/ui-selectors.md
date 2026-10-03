# Surpluss Catalogue UI Selectors Reference

Prefer accessible roles, labels, and names over CSS selectors. Confirm selectors against rendered UI when adding automation; labels can change as product copy evolves.

## Login

- Email: `getByLabel('Email')` or `getByRole('textbox', { name: /email/i })`
- Password: `getByLabel('Password')`
- Submit: `getByRole('button', { name: /sign in/i })`
- Route: `/login`

## Admin Navigation

- Catalogue list: `getByRole('link', { name: /catalogues/i })`
- Products: `getByRole('link', { name: /products/i })`
- Leads: `getByRole('link', { name: /leads/i })`
- Settings: `getByRole('link', { name: /settings/i })`

## Catalogues

- Page route: `/admin/catalogues`
- Page heading: `getByRole('heading', { name: 'Catalogues' })`
- Create control: `getByRole('button', { name: /new catalogue/i })`
- Catalogue row should be located by its catalogue name, then scope row actions inside that row.
- Public slug examples: `premium-corporate-essentials`, `festive-overstock-2026`, `monsoon-clearance-2026`.
- UI uses status/filter controls; inspect accessible names and roles in current implementation before relying on a specific filter locator.
- Detail route: `/admin/catalogues/{catalogueId}`; UUID is database-generated, so query it or navigate through the list rather than hardcoding.

## Products

- Product library route: `/admin/products`
- Add product: `getByRole('button', { name: /add product/i })`
- Search: `getByPlaceholder(/search by name, sku or brand/i)`
- Common editor labels: `Name`, `SKU`, `MRP`, `Offer price`, `Quantity`, `MOQ`.
- Per-row actions may be exposed as `Actions for {name}`; prefer row scoping.

## Leads

- Lead inbox route: `/admin/leads`
- Search: `getByPlaceholder(/search buyer, reference or contact/i)`
- Status filter: locate by accessible label/name containing status.
- Lead detail links are labeled by reference; scope by the unique enquiry reference returned from submission.
- Detail controls include status, internal notes, and save-notes action.

## Public Catalogue and Enquiry

- Live seeded route: `/catalogue/premium-corporate-essentials`
- Product search: `getByPlaceholder(/search products/i)`
- Product page route: `/catalogue/{slug}/product/{productId}`.
- Contact action/dialog heading: `Contact supplier`.
- Form fields: buyer name, WhatsApp number/email, requested quantity, optional referral person/message.
- Submit: `getByRole('button', { name: /send enquiry/i })`.
- Wait for the `POST /api/enquiries` response and assert the returned reference; do not use fixed sleeps.

## Selector Guidance

- Use `getByRole`, `getByLabel`, and `getByPlaceholder` before CSS selectors.
- Scope duplicate buttons to the matching catalogue/product row.
- Use web-first assertions and response waits. Avoid `waitForTimeout`.
- If a control has no stable accessible name, add a focused `data-testid` in the component rather than depending on generated classes.