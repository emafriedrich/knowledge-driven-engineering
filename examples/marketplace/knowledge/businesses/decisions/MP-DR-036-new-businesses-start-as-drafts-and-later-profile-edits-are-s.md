---
id: MP-DR-036
title: New businesses start as drafts and later profile edits are staged until published
status: accepted
created: 2026-09-24
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: [MP-DR-030, MP-DR-033]
related: [MP-DR-009, MP-DR-023, MP-DR-034, MP-DR-035]
supersedes: []
superseded_by: []
---

# MP-DR-036: New businesses start as drafts and later profile edits are staged until published

## Context

`create-business/action.ts:23-25` creates every business with `isActive`,
`isOpen` and `isStorefrontPublished` all `true`, a placeholder logo and cover
(`placehold.co`) and no schedule, payment setup or products. The instant the
SaaS admin creates it, it is orderable, listed in the city marketplace and
shows placeholder images to customers. There is no moment where the merchant
prepares the storefront before customers see it.

The same gap exists after launch: every save in settings goes straight to the
public page. A merchant changing the logo, name and description sees each
half-finished step live.

The product owner decided on 2026-09-24 that there must be a draft. Nothing is
launched, so columns and defaults can change freely.

"Published" already means "listed in the marketplace" (`isStorefrontPublished`,
MP-DR-030). To avoid a third meaning, this record uses **draft / live** for the
lifecycle and **publish changes** for staged edits.

## Decision

### Lifecycle: draft → live

1. **Explicit lifecycle column.** `businesses.lifecycle_status text NOT NULL
   CHECK (lifecycle_status IN ('draft','live'))`, plus
   `went_live_at timestamptz NULL`. It is orthogonal to the MP-DR-030 flags:
   `isActive` is the account lockout, `lifecycle_status` is whether the
   storefront has ever been released.
2. **New businesses are `draft`.** `create-business` writes
   `lifecycle_status = 'draft'`, `deactivatedAt = null` — i.e. active, per
   MP-DR-030 rule 1 (the merchant can log in and set up) — `isOpen = false`, `isStorefrontPublished = false`, seven closed
   schedule days (MP-DR-033 rule 6).
3. **A draft business is invisible to customers.** Direct URL and slug lookup
   answer not found; it never appears in discovery; checkout rejects it as a
   nonexistent business. Merchant staff see it in admin with a preview of the
   storefront.
4. **The merchant takes it live** with "Poner en línea" (capability
   `business.configure`, MP-DR-004), after an onboarding checklist that the API
   validates (not only the UI):
   - name, address with coordinates, phone or WhatsApp;
   - a real logo (not the placeholder);
   - at least one open day in the schedule (MP-DR-033);
   - at least one accepted payment method (MP-DR-009);
   - at least one sellable product.
   Failing items return `businesses.go_live_incomplete` with the list of
   missing items (MP-DR-023). Success sets `lifecycle_status = 'live'`,
   `went_live_at = now()` and records a `business_went_live` event.
5. **Going live does not list it in the marketplace.** `isStorefrontPublished`
   stays a separate opt-in (MP-DR-030 rule 3, MP-DR-008 commission). Going live makes
   the direct link work; the merchant opens it with the manual switch within
   the schedule (MP-DR-034).
6. **There is no way back to `draft`.** A live business that must disappear is
   deactivated (MP-DR-035). `saas_admin` can take a draft live on the merchant's
   behalf, under the same checklist.

### Staged profile edits on a live business

7. **Presentation fields are staged, not written live.** For a `live`
   business, edits to name, description, logo, cover image, phone, WhatsApp
   and address go to a draft, stored in the `businesses` row. Address means
   the whole location unit — street address **and** its `latitude`/
   `longitude` — since `create-business`/`update-business-settings` params
   already validate the three together; staging the text without the
   coordinates (or vice versa) would let the map pin and the displayed
   address disagree until "Publicar cambios."
   - `profile_draft jsonb NULL` — only the fields that differ from live, e.g.
     `{"name": "...", "logoUrl": "..."}`, keyed by the same names as the
     settings params;
   - `profile_draft_updated_at timestamptz NULL` — last draft save;
   - `profile_draft_updated_by uuid NULL` — user who saved it;
   - `profile_draft_base_at timestamptz NULL` — the business's `updated_at`
     when the draft was started.
   Timestamps are columns, not keys inside the JSON, so admin can list and
   sort "businesses with unpublished changes" without parsing JSON, and the
   JSON stays a pure patch of profile fields.
8. **One draft per business.** Saving again merges into the existing draft;
   it is not an edit history. The audit trail of what went live is
   `business_events` (`business_profile_published`, with the applied patch).
9. **"Publicar cambios" applies the draft atomically.** The merged result
   (live + draft) is validated with the same rules as the settings params;
   if valid, the fields are written, the draft columns are set to `NULL` and
   the event is recorded, in one transaction. "Descartar cambios" nulls the
   draft columns.
10. **Conflict check.** If `businesses.updated_at` moved past
    `profile_draft_base_at` (someone changed the live profile, e.g. a
    `saas_admin`), publishing fails with `businesses.profile_draft_stale`; the
    admin shows the live values against the draft so the merchant decides.
11. **Operational settings are never staged.** The manual open switch,
    schedule (MP-DR-033), payment methods and transfer data (MP-DR-009), delivery
    fees and anything checkout reads apply immediately: they are operations,
    not presentation, and a merchant closing for rain cannot wait for a
    publish step. While the business is `draft`, every field is written
    directly (there is nothing public to protect).
12. **Customers only ever read live columns.** No storefront or checkout
    code reads `profile_draft`. Admin preview renders live + draft.

## Consequences

- Migration: `lifecycle_status`, `went_live_at` and the four `profile_draft*`
  columns. Seeds create `live` businesses.
- API: `create-business` defaults change; new `go-live`, `publish-profile-draft`
  and `discard-profile-draft` actions; `update-business-settings` splits into
  staged (presentation) and immediate (operational) fields for live
  businesses; `get-business`, `get-business-by-slug`, discovery and
  `findCheckoutPolicy` treat `draft` as not found.
- Admin: onboarding checklist and "Poner en línea"; "Cambios sin publicar"
  bar with preview, publish and discard; `saas_admin` business list shows
  lifecycle and pending drafts.
- Tradeoff of JSON: the database does not validate the draft's shape, so
  validation happens on every draft save and again on publish; renaming a
  profile field needs a data migration of pending drafts (cheap while nothing
  is live).
- Why not a `business_drafts` table or full row copy: one draft per business,
  few fields, no history needed — a separate table adds joins and lifecycle
  without buying anything. If edit history or review by another person
  becomes a requirement, revisit with a table.
- **Out of scope:** approval of drafts by `saas_admin` (merchant publishes
  their own changes), staging catalog/product edits, scheduled publishing.
- `docs/sistema/businesses.md` "No hay estado de borrador/revisión antes de
  publicar" becomes obsolete once implemented.

## Supersession

None.
