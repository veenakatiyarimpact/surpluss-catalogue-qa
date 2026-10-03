# Findings

The following issues were reproduced by the automated regression suite on 2026-10-03. The bug tests intentionally assert the expected secure/correct behavior, so they remain red until the corresponding fixes are made.

---

## 1. Staff can create a published catalogue

**What happens**

The `createCatalogueWithProducts` server action checks that a user is signed in but does not check the user's role before accepting `publish: true`. A staff user can therefore create a catalogue already published to buyers, bypassing the stated admin-only publication policy.

**Steps to reproduce**

1. Sign in as `staff@catalogue.test`.
2. Call `createCatalogueWithProducts` directly with otherwise-valid catalogue data and `publish: true` (the UI's create-and-go-live path or a direct server-action invocation).
3. Observe that the action creates the catalogue and returns a successful published result instead of denying the request.

**What should happen instead**

The server action should reject a staff actor before starting the database transaction. Only an admin should be able to create a catalogue in the published state.

**Impact — how bad is this, and why?**

**High (authorization/confidentiality).** Staff can expose buyer-specific or unapproved pricing to the public internet without admin sign-off. The source seed includes a draft catalogue explicitly marked confidential.

**Failing test**

`tests/bugs/catalogue-create-role.test.js` — `does not let staff create a published catalogue`

---

## 2. Staff can delete a catalogue

**What happens**

The `deleteCatalogue` server action validates that an actor is signed in but does not require the admin role. A staff user can call the action and delete a catalogue, despite the stated policy reserving catalogue deletion to admins.

**Steps to reproduce**

1. Sign in as a staff user.
2. Invoke `deleteCatalogue` directly with the UUID of a catalogue that has no attached enquiries.
3. Observe the action returns success and calls the database delete operation.

**What should happen instead**

The action should return an authorization error for staff and must not call Prisma. An admin may proceed, subject to the enquiry-history constraint.

**Impact — how bad is this, and why?**

**High (unauthorized destructive action).** A staff account can remove a shareable catalogue and its listings. Catalogues with enquiries are protected by a database relation, but catalogues without enquiry history can still be deleted by staff.

**Failing test**

`tests/bugs/catalogue-delete-role.test.js` — `denies catalogue deletion to staff before calling Prisma`

---

## 3. Catalogue search exposes draft and expired product data

**What happens**

`GET /api/catalogues/[slug]/search` reads the catalogue's status and expiry but does not enforce them before querying listings. Anonymous callers can receive product IDs, names, SKUs, and offer prices for a draft or expired catalogue.

**Steps to reproduce**

1. Make an unauthenticated GET request to `/api/catalogues/festive-overstock-2026/search?q=...` for a product in the seeded draft catalogue, or request the expired catalogue's search route.
2. Observe a `200` response containing matching product data rather than a non-public response.
3. Compare with the public page, which does not display products for a draft catalogue and shows an expired notice for an expired catalogue.

**What should happen instead**

The search handler should reject missing, draft, inactive, or expired catalogues before querying listings and must return no product identifiers or pricing for them.

**Impact — how bad is this, and why?**

**Critical (data confidentiality).** The API leaks confidential catalogue contents and negotiated prices to anyone who knows or guesses a slug. This bypasses the public page's visibility behavior and can expose commercial pricing.

**Failing test**

`tests/bugs/public-search-visibility.test.js` — `does not return product data for draft catalogues`

`tests/bugs/public-search-visibility.test.js` — `does not return product data for published catalogues` (expired fixture)

---

## 4. Enquiry API accepts requests for non-public catalogues

**What happens**

`POST /api/enquiries` checks that requested products are visible listings and validates MOQ/stock, but it never checks that the selected catalogue is published and unexpired. Direct callers can create leads that snapshot confidential draft or stale expired pricing.

**Steps to reproduce**

1. Obtain a valid catalogue UUID and visible listing from a draft or expired catalogue.
2. POST a valid buyer name, contact phone, catalogue UUID, and an in-range item quantity to `/api/enquiries`.
3. Observe that the endpoint returns `201` and calls the enquiry create operation for draft, expired, or inactive catalogue state.

**What should happen instead**

Before creating the enquiry, the handler should verify the catalogue is published and not expired. Rejected submissions must not create an enquiry or item snapshot.

**Impact — how bad is this, and why?**

**High (confidentiality and commercial integrity).** A caller can lodge a lead tied to unapproved or stale pricing and cause sales staff to receive and potentially honor an invalid quote. The public UI being unavailable does not protect the API.

**Failing test**

`tests/bugs/enquiry-catalogue-visibility.test.js` — `rejects an enquiry for a draft catalogue`

`tests/bugs/enquiry-catalogue-visibility.test.js` — `rejects an enquiry for a expired catalogue`

`tests/bugs/enquiry-catalogue-visibility.test.js` — `rejects an enquiry for a inactive catalogue`

---

## 5. Listing mutations are not scoped to the catalogue in the URL

**What happens**

The nested listing `PATCH` and `DELETE` handlers first validate that the URL's catalogue exists, but their Prisma mutation filters only by `listingId`. A signed-in user can supply catalogue A's URL and a listing ID belonging to catalogue B; the handler still updates or deletes that listing.

**Steps to reproduce**

1. Create catalogues A and B, with a listing attached to B.
2. Sign in and send `PATCH /api/admin/catalogues/{A}/listings/{B-listing}` with `{ "isVisible": false }`, or send `DELETE` to the same mismatched path.
3. Observe the listing belonging to B is mutated even though the request names A as its parent.

**What should happen instead**

Both mutations should include `catalogueId` and `listingId` in the database predicate. A mismatched parent/listing pair should return `404` and leave the listing unchanged.

**Impact — how bad is this, and why?**

**High (cross-resource integrity/access control).** Any authenticated portal user can alter or remove a listing in a different catalogue by substituting its ID, potentially changing the inventory shown to another buyer or disrupting an unrelated campaign.

**Failing tests**

`tests/bugs/listing-parent-scope.test.js` — `does not update a listing that belongs to another catalogue`

`tests/bugs/listing-parent-scope.test.js` — `does not delete a listing that belongs to another catalogue`

---

## 6. Admin catalogue status reverses the expiry condition

**What happens**

`effectiveStatus` marks a published catalogue as expired when its expiry is in the future, and leaves a catalogue published after its expiry has passed. The public catalogue query uses the opposite comparison, so the admin status can disagree with public availability.

**Steps to reproduce**

1. Evaluate `effectiveStatus("published", futureDate)` with the current time before `futureDate`.
2. Observe it returns `expired` instead of `published`.
3. Evaluate `effectiveStatus("published", pastDate)` with the current time after `pastDate`.
4. Observe it returns `published` instead of `expired`.

**What should happen instead**

A future expiry or no expiry should remain published; a past expiry should be expired. The admin status and public catalogue behavior should agree at the expiry boundary.

**Impact — how bad is this, and why?**

**High (commercial availability and stale pricing).** Admins may believe a valid catalogue has expired or that an expired catalogue remains live. This can prevent active offers from being managed correctly or lead staff to trust stale campaign status.

**Failing tests**

`tests/bugs/catalogue-status.test.js` — `keeps a published catalogue live before its expiry`

`tests/bugs/catalogue-status.test.js` — `marks a published catalogue expired after its expiry`

---

## 7. Concurrent enquiries can collide on reference number

**What happens**

The enquiry API constructs references from the last seven digits of `Date.now()`. Two requests during the same millisecond get the same reference, and the database's unique constraint causes one insert to fail with a generic `500`.

**Steps to reproduce**

1. Submit two valid `POST /api/enquiries` requests at the same time while the clock returns the same millisecond.
2. Observe that both generate the same reference.
3. The first request returns `201`; the second hits the unique-reference constraint and returns `500` without saving the lead.

**What should happen instead**

Generate collision-resistant references, or retry safely on a unique conflict, so concurrent valid enquiries both receive distinct references and persist.

**Impact — how bad is this, and why?**

**High (lost sales leads).** Under concurrent submissions, a buyer's enquiry may be lost without a useful retry response, preventing the sales team from following up.

**Failing test**

`tests/bugs/enquiry-catalogue-visibility.test.js` — `stores two simultaneous enquiries with distinct references`
