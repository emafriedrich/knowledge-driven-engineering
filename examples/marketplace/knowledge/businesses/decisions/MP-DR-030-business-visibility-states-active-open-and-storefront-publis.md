---
id: MP-DR-030
title: "Business visibility states: active, open and storefront-published"
status: accepted
created: 2026-09-22
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: []
related: [MP-DR-009, MP-DR-023, MP-DR-034, MP-DR-035, MP-SPEC-004, MP-SPEC-007]
supersedes: []
superseded_by: []
---

# MP-DR-030: Business visibility states: active, open and storefront-published

<!-- Primary question: What important decision did we make and why? -->

> **For implementers — the short version.** The stored `is_active` column
> is **removed**. It is replaced by `deactivated_at` (nullable timestamp)
> plus a deactivation reason and optional note. A business is active if and
> only if `deactivated_at IS NULL`; `isActive` survives only as a value
> derived from that, never stored. `isOpen` and `isStorefrontPublished` stay
> as stored booleans. What exactly changes, and how to verify it, is in
> MP-SPEC-004 (deactivation and publishing, backend), MP-SPEC-005 (availability,
> backend), MP-SPEC-006 (storefront UI) and MP-SPEC-007 (admin UI).

## Context

**As of 2026-09-22, before this decision is implemented**, a business has
three stored boolean flags: `is_active`, `is_open` and
`is_storefront_published`. The code does **not** treat them as three
distinct, independently meaningful states:

- The public discovery listing filters on `isActive && isStorefrontPublished`
  only. The home page only shows businesses that are open right now ("Abiertos
  ahora"); closed businesses do not appear on it at all.
- Looking a business up directly by `id` or `slug` did not filter by any of
  the three flags. (`get-business/action.ts` and
  `get-business-by-slug/action.ts` were changed on 2026-09-24, alongside
  [[MP-DR-035]]/[[MP-DR-036]], to reject inactive businesses.)
- `isOpen` is informational only: the direct business page says it is
  closed, but checkout (`create-order`) does not check it.
- The stored `is_open` is a manual, owner-controlled switch, distinct from
  the per-day schedule (`business.schedule`). `isBusinessOpenNow`
  (`discovery-service.ts`) collapses active, published, the manual switch and
  today's schedule window into one boolean, so nothing can tell *why* a
  business is closed.
- Deactivation (`deactivate-business`) turns off all three flags together
  and records no reason or date.

This record defines what each state means on its own. It does not itself
implement the change — see the specs listed above.

**Revision history (2026-09-25):**
- Point 2 rewritten: the 2026-09-22 draft hid `isOpen = false` businesses
  from listings; they are now listed, marked unavailable, grouped below the
  open ones, with a message that depends on why they're closed.
- Point 1 rewritten: deactivation records a reason and a date, and
  `deactivatedAt` replaces the stored `is_active` boolean as the single
  source of truth. Scheduled (future-dated) deactivation is ruled out.

## Decision

1. **A deactivated business is fully locked out.** Deactivation means the
   business's account with the platform is not active (e.g. unpaid plan,
   offboarded). While deactivated:
   - The business does not appear anywhere in the storefront (listing,
     search or direct URL).
   - Users belonging to that business cannot access it (no admin/staff
     access).
   - This is the **only** state that removes a business from the platform
     entirely — no combination of the other two states does (contrast with
     points 2 and 3).

   How deactivation is stored:
   - **`deactivatedAt` is the single source of truth. There is no stored
     `is_active`.** A business is active if and only if `deactivatedAt` is
     null. `isActive` may still exist in code as a derived, read-only value
     (`deactivatedAt === null`). Rationale: a stored boolean next to a date
     and a reason makes impossible states representable (active with a
     deactivation date, inactive with no reason, a reactivation that flips
     the boolean but forgets the rest).
   - Deactivating sets, in one write: `deactivatedAt` (the moment it
     happens), a **reason** from a fixed set of categories (e.g.
     `non_payment`, `terms_violation`, `business_requested`, `other`; the
     final set is an implementation detail) and an optional free-text
     **note**. `deactivatedAt` and the reason are both set or both null,
     enforced by the database, not only by application code.
   - **No scheduled deactivation.** `deactivatedAt` is always `now()`, never
     a future date. The rule is strictly "null or not null"; nothing compares
     it against the current time. Deferred deactivation, if ever needed, is a
     separate field and a separate decision.
   - Only `saas_admin` deactivates, entering the reason manually. There is no
     automated billing integration today; if one is added, revisit this.
   - The date, reason and note are **internal-only**: visible to
     `saas_admin`/staff, never to the business's own dashboard or to
     customers.
   - Reactivating clears all three (setting `deactivatedAt` back to null is
     what reactivates). They are not kept on the business row; the history
     of past deactivations lives in `business_events`
     (`business_deactivated`/`business_activated`). How that log should
     evolve is left to a separate RFC.

2. **A business that is closed right now is still listed, clearly marked
   unavailable, below the open ones.** "Closed right now" means either the
   manual `isOpen` switch is off, or the current time is outside today's
   schedule window.
   - **General rule: a closed business can still be explored, but is never
     pushed as something to order right now.** People want to look up a
     closed business anyway ("me lo recomendaron", "me llamó la atención")
     to see its menu, address and details. So the *business* stays findable
     and its page fully browsable, while *product* suggestions — which invite
     an immediate order — only come from open businesses.
   - It still appears in business listings, on the home and in search
     results; only deactivation (point 1) and not being published (point 3)
     keep a business out of them.
   - **Open businesses are listed first. Closed ones are grouped in their own
     section below them**, titled "Negocios temporalmente cerrados", and
     rendered visibly dimmed (slight transparency) so they can't be mistaken
     for open ones. This applies to the home and to search results alike.
   - **Its products are hidden from product-level discovery** (home product
     sections such as "Los más pedidos" and "Comer bien y barato", and
     product results in search) while it is closed. They show up again as
     soon as it opens.
   - Its catalog stays viewable everywhere, including its direct page.
     **Checkout is blocked** while it is closed; browsing is not. (This
     settles the question the 2026-09-22 draft left open.)
   - The message depends on why it is closed:
     - **Outside its schedule** (manual switch on): say when it opens next,
       e.g. "Abre hoy a las 18:00" / "Abre el lunes a las 11:00".
     - **Manual switch off**: say only that it's temporarily unavailable —
       no reopening time, because the owner can turn it back on at any
       moment.
     - **Both at once**: the manual switch wins, since it's the owner's
       explicit signal. (This tie-break was not discussed explicitly; flagged
       in case it needs revisiting.)

3. **`isStorefrontPublished = false` means "not listed in the marketplace,"
   not "hidden."** While unpublished:
   - The business is excluded from storefront listings and search.
   - Its direct URL keeps working normally — a merchant can share its own
     link without being in the marketplace.
   - The business can turn it on or off itself (self-service), not only
     `saas_admin`.

4. **`isStorefrontPublished` is the marketplace opt-in for commission
   purposes.** Turning it on exposes the business to marketplace-driven
   customer acquisition, and therefore to the marketplace commission in
   MP-DR-008 (0% direct, commission only on new customers acquired via the
   marketplace). Turning it off stops new marketplace-attributed orders but
   does not change commission already recorded.

5. **The three states are independent.** A business can be active, closed
   and published — or any other combination — and each has only the effect
   described above. `isOpen` and `isStorefrontPublished` remain plain stored
   booleans: they are owner toggles with no reason or date attached, so there
   is nothing for them to drift out of sync with. (Deactivation additionally
   resets both to `false`, so a reactivated business comes back closed and
   unlisted — see MP-DR-035.)

## Consequences

- This is a **behavior change from today's code**. The concrete changes and
  their acceptance checks live in the specs, not here:
  - **MP-SPEC-004** — deactivation model (`is_active` → `deactivated_at` +
    reason + note), lockout, reactivation, self-service publishing (backend).
  - **MP-SPEC-005** — availability status and next opening time in the
    discovery and business APIs, the "temporarily closed" home section,
    checkout gate (backend).
  - **MP-SPEC-006** — storefront: open first, "Negocios temporalmente
    cerrados" section below, dimmed cards, closed messaging, checkout
    disabled (frontend).
  - **MP-SPEC-007** — admin: deactivation with reason for `saas_admin`,
    publish toggle for the merchant (frontend).
- MP-DR-034 (orders only while open) overlaps with the checkout gate in point
  2; MP-SPEC-005 implements both consistently.
- `docs/sistema/businesses.md` and `docs/sistema/discovery.md` need a
  re-pass once implemented.

## Supersession

None.
