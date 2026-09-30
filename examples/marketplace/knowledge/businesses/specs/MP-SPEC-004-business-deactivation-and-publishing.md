---
id: MP-SPEC-004
title: Business deactivation and marketplace publishing (backend)
status: current
created: 2026-09-25
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [spec]
depends_on: [MP-DR-030, MP-DR-035]
related: [MP-DR-023, MP-DR-036, MP-SPEC-007]
---

# MP-SPEC-004: Business deactivation and marketplace publishing (backend)

<!-- Primary question: What behavior and constraints must the implementation satisfy? -->

## Scope

Implements MP-DR-030 points 1, 3 and 5, and MP-DR-035, in `apps/api`:

- Replacing the stored `is_active` boolean with `deactivated_at` + reason +
  note.
- Deactivation and reactivation by `saas_admin`.
- Lockout of deactivated businesses (storefront and their own users).
- Self-service marketplace publishing (`isStorefrontPublished`) for the
  merchant.

Out of scope: open/closed availability and checkout gating (MP-SPEC-005), all
UI (MP-SPEC-006, MP-SPEC-007), and the business activity log beyond the events
already emitted (separate RFC).

### What is removed and what replaces it

| Removed | Replaced by |
|---|---|
| Column `businesses.is_active` | `businesses.deactivated_at timestamptz NULL` (null = active) |
| Index `businesses_is_active_idx` | Nothing (almost every business is active; the index has no selectivity) |
| — (no reason recorded) | `businesses.deactivation_reason` (fixed categories) and `businesses.deactivation_note text NULL` |
| SQL filters `is_active = true` / `b.is_active` | `deactivated_at IS NULL` |
| Stored `isActive` read from the row | Derived in the repository mapper: `isActive = deactivated_at === null` |
| `updateBusinessActivation({ isActive, isOpen, isStorefrontPublished })` | `deactivateBusiness({ businessId, reason, note })` and `reactivateBusiness({ businessId })`; `isOpen`/`isStorefrontPublished` keep their own update paths |
| `deactivate-business` params `{ businessId }` | `{ businessId, reason, note? }` |

## Required Behavior

### Storage

1. A migration adds `deactivated_at timestamptz NULL`,
   `deactivation_reason` and `deactivation_note text NULL` to `businesses`,
   and drops `is_active` and `businesses_is_active_idx`. The product isn't
   live, so no backfill or compatibility step is needed.
2. `deactivation_reason` accepts only the fixed categories:
   `non_payment`, `terms_violation`, `business_requested`, `other`. It is
   enforced in the database (enum type or CHECK), not only in code.
3. A CHECK constraint enforces
   `(deactivated_at IS NULL) = (deactivation_reason IS NULL)`, and
   `deactivation_note` is null whenever `deactivated_at` is null.
4. No code path writes a `deactivated_at` other than the database's current
   time (`now()`). No code compares `deactivated_at` against the current
   time; activity is strictly `deactivated_at IS NULL`.

### Deactivation and reactivation

5. `PATCH /admin/saas/businesses/:business_id/deactivate` (saas_admin only)
   requires `reason` (one of the categories) and accepts an optional `note`.
   In one write it sets `deactivated_at = now()`, the reason and the note,
   and sets `is_open = false` and `is_storefront_published = false`
   (MP-DR-035). It records `business_deactivated` in `business_events` with the
   reason in `metadata`.
6. Deactivating an already-deactivated business is rejected with a stable
   code (MP-DR-023). It must not overwrite the original date and reason.
7. `PATCH /admin/saas/businesses/:business_id/activate` (saas_admin only)
   sets `deactivated_at`, `deactivation_reason` and `deactivation_note` to
   null and touches nothing else (`is_open` and `is_storefront_published`
   stay `false`). Reactivating an active business is a no-op success
   (MP-DR-035 rule 6). It records `business_activated`.
8. A missing or unknown `reason` fails with `businesses.invalid_payload`;
   an unknown business fails with `businesses.not_found` (existing codes,
   MP-SPEC-003).

### Lockout

9. Every storefront read (discovery listing, search, lookup by `id` or
   `slug`) excludes deactivated businesses; direct lookup of one returns
   `businesses.not_found`, the same as a business that doesn't exist, so a
   customer can't tell the two apart.
10. Users belonging to a deactivated business cannot log in to the merchant
    admin, and an existing session is rejected on its next request, with a
    stable auth error code (MP-DR-023). `saas_admin` users are unaffected.

### Internal-only data

11. `deactivatedAt`, `deactivationReason` and `deactivationNote` are
    returned only by `saas_admin` endpoints. They are absent from every
    storefront/discovery response type and from every merchant-scoped
    endpoint.

### Self-service publishing

12. A merchant-scoped endpoint lets a user with the business `admin` role
    set `isStorefrontPublished` on their own business, and records
    `storefront_published`/`storefront_disabled` in `business_events`, the
    same as the existing saas_admin route. The saas_admin route
    (`PATCH /admin/saas/businesses/:business_id/storefront`) keeps working.
13. A deactivated business cannot be published by its merchant (it can't
    authenticate, per rule 10), and publishing never changes
    `deactivated_at`.

## Constraints

- No production data (as of 2026-09-25): the migration may drop columns
  directly.
- Error codes follow MP-SPEC-003: declared once per context, new numeric codes
  taken from the next free number in the context's range.
- `isOpen` and `isStorefrontPublished` remain plain stored booleans; do not
  apply the timestamp pattern to them (MP-DR-030 point 5).

## Acceptance Checks

- `grep -rn "is_active" apps/api --include=*.ts --include=*.sql` returns no
  hit on `businesses` outside historical migrations (categories/products/users
  columns of the same name are unrelated).
- After migrating, `\d businesses` shows `deactivated_at`,
  `deactivation_reason`, `deactivation_note` and no `is_active`.
- A direct `INSERT`/`UPDATE` setting `deactivated_at` without a reason, or a
  reason without `deactivated_at`, fails on the CHECK constraint.
- Test: deactivate with `reason = non_payment` → row has
  `deactivated_at` ≈ now, reason set, `is_open = false`,
  `is_storefront_published = false`; a `business_deactivated` event exists
  with the reason.
- Test: deactivate without reason → `businesses.invalid_payload`.
- Test: deactivate twice → second call rejected; the stored date and reason
  are unchanged.
- Test: reactivate → the three deactivation fields are null; `is_open` and
  `is_storefront_published` still `false`; `business_activated` event exists.
- Test: reactivate an active business → success, no change.
- Test: a deactivated business is absent from discovery listing and search,
  and lookup by `id`/`slug` returns `businesses.not_found`.
- Test: a merchant user of a deactivated business cannot log in, and an
  existing session is rejected.
- Test: no storefront or merchant response includes `deactivatedAt`,
  `deactivationReason` or `deactivationNote`.
- Test: a business admin can publish/unpublish their own business; a
  non-admin role cannot; neither can touch another business.
