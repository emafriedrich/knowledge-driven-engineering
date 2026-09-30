---
id: MP-RFC-003
title: "Business friendly code: generate on create, editable after"
status: accepted
created: 2026-09-22
updated: 2026-09-27
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: "docs/sistema/businesses.md (2026-09-22) found that businesses.code is NOT NULL UNIQUE since migration 014, but PostgresBusinessRepository.create() never inserts a value for it and there is no DB default or trigger on the businesses table — creating a business against real Postgres should fail on the NOT NULL constraint. Nothing is in production yet, so it hasn't broken anything real."
scope: [businesses]
tags: [rfc]
depends_on: []
related: []
---

# RFC: Business friendly code: generate on create, editable after

<!-- Primary question: What significant change are we proposing, why, what alternatives exist, and what questions need resolution? -->

## Summary

Creating a business should always end up with a valid `code` (the 3-letter
prefix used in `products.friendly_id` / `orders.friendly_id`, e.g. `PIZ-42`).
The frontend should default it to something derived from the business name
and let the merchant edit it before submitting; if the create request
doesn't include one, the backend generates the best one it can — reusing
the derivation logic that already exists, rather than inventing a new one.

## Problem

- `apps/api/infra/db/migrations/014_add_friendly_ids_for_orders_and_products.sql`
  made `businesses.code VARCHAR(3) NOT NULL UNIQUE`, and defined a Postgres
  function, `build_friendly_business_code(source_text)`, that derives a
  3-letter code from a name/slug (first 3 letters, uppercased, padded with
  `X`). But that function is only ever called once, in that migration's own
  backfill `UPDATE` for pre-existing rows — nothing wires it to `INSERT`.
  Unlike `products` and `orders`, the `businesses` table has no
  `BEFORE INSERT` trigger to assign it automatically.
- `CreateBusinessParamsInput`
  (`apps/api/contexts/businesses/features/management/actions/create-business/params.ts`)
  has no `code` field at all today, and
  `PostgresBusinessRepository.create()` never inserts one. Against real
  Postgres, creating a business fails on the `NOT NULL` constraint. Against
  the in-memory repository used in tests, it doesn't — so this has no test
  coverage catching it and hasn't been noticed.
- A second, independent TS implementation of the same derivation already
  exists for seeding: `deriveBusinessCode`/`allocateBusinessCode` in
  `apps/api/infra/db/seeds/generate-storefront-seed.ts:352-380`. It's not
  imported anywhere outside the seed script.
- Today `code` cannot be edited anywhere — it's not in
  `update-business-settings/params.ts` either. So even if it were generated
  correctly on create, a merchant stuck with a bad auto-generated code
  (e.g. two businesses named similarly enough to collide, or a name that
  reduces to something embarrassing or confusing) has no way to fix it.
- Business creation itself is currently `saas_admin`-only, through the
  internal SaaS console (`saas.routes.ts`) — there is no merchant
  self-service "create your account" flow yet. So "when the merchant
  creates their account" describes a UI that doesn't exist today; this RFC
  covers the rule for whichever surface ends up creating businesses
  (`saas_admin` console today, a merchant signup flow if/when it exists).

## Proposal

1. **Whatever creates a business always sends a `code`.** Add `code` to
   `CreateBusinessParamsInput`, defaulted client-side from the business name
   using the same derivation as `build_friendly_business_code` /
   `deriveBusinessCode` (first 3 letters, uppercased, padded with `X`), and
   shown as an editable field so the person creating the business can change
   it before submitting.
2. **If no `code` arrives, the backend derives one itself**, reusing
   `deriveBusinessCode` (move it out of the seed script into a shared
   location both the seed and `BusinessService`/`create-business` action can
   import) rather than re-implementing the algorithm a third time.
3. **Collisions are resolved server-side**, not left to the DB to reject.
   On a `code` collision (submitted or derived), the backend should pick the
   next available code deterministically — `allocateBusinessCode`'s
   walk-the-3-letter-space approach already does this in the seed script,
   but there it works off an in-memory set; the real action needs to check
   against the DB (e.g. retry-on-unique-violation, or a `SELECT` first).
4. **`code` becomes editable after creation, but only while the business has
   no history yet** — no order has been received and no product has been
   created. Once either exists, the field is locked (server-side check in
   `update-business-settings`, returning a domain error if the caller tries
   to change it). Same validation (`^[A-Za-z]{3}$`, effectively) and
   uniqueness check as creation. Rationale: `assign_product_friendly_id` and
   `assign_order_friendly_id` bake `businesses.code` into each row's
   `friendly_id` at insert time and never rewrite it, so editing after
   history exists would permanently split a merchant's catalog/orders across
   two prefixes — a data-integrity risk no UX warning can undo. Before any
   history exists, editing is safe because nothing references the old code.
5. **The admin/merchant UI shows the code input with a prominent banner
   explaining the one-shot nature, but ONLY when the business still has no
   orders and no products** — i.e. only while editing is actually allowed.
   Copy along the lines of: *"Podés cambiar el código sólo hasta que recibas
   el primer pedido o cargues el primer producto. Después queda fijo para
   siempre porque forma parte de los identificadores de tus pedidos y
   productos."* When the business already has history, the banner is not
   shown (there is nothing to warn about) and the input is rendered as
   read-only/disabled with a short inline note ("El código no se puede
   cambiar una vez que hay pedidos o productos"). The "has history"
   signal comes from the same server check that gates the update, exposed
   on the business settings payload so the UI doesn't have to guess.

## Alternatives

Not considered. When this RFC is promoted to a DR, the DR records only the
chosen design (proposal items 1–5); alternatives are intentionally out of
scope and should not be carried into the DR.

## Open Questions

- ~~**Consequence of editing `code` after orders/products already exist.**~~
  **Resolved (2026-09-27):** editing is blocked, not warned about — see
  proposal item 4. `assign_product_friendly_id`/`assign_order_friendly_id`
  bake `businesses.code` into each row's `friendly_id` at insert time and
  never rewrite it, so allowing the edit after history exists would leave a
  merchant with two prefixes across their catalog and order history forever.
  The field is locked as soon as either the first order is received or the
  first product is created.
- ~~**Exactly what the frontend default algorithm should do**~~
  **Resolved (2026-09-27):** the code is always exactly three ASCII
  uppercase letters, `^[A-Z]{3}$`. No spaces, digits, symbols, accents or
  ñ. Both the frontend input and the backend validator enforce the same
  regex and reject anything else outright — without that rule the two ends
  disagree and validation flakes.
  Derivation from the business name: strip accents (NFD + remove combining
  marks; ñ → n), keep only `[A-Za-z]`, uppercase, take the first three
  characters. If fewer than three survive (very short or all-symbol names),
  pad on the right with `X` to reach three, matching what
  `build_friendly_business_code` already does in SQL. The frontend
  suggestion is best-effort; the backend is the source of truth on
  collisions and resolves them by walking the 3-letter space
  (`allocateBusinessCode`).
- ~~**Who is allowed to edit `code` after creation**~~
  **Resolved (2026-09-27):** the same capability as creating/configuring a
  business — `business.configure` (MP-DR-004). No separate guard; the
  history-lock in proposal item 4 already contains the risk, so the
  capability doesn't need to be narrower.
- Whether to also add the DB-trigger stopgap (first Alternative) as an
  immediate fix regardless of when the rest of this RFC is implemented, so
  the NOT NULL bug can't bite even if this larger design takes a while to
  land.
  **Done (2026-09-24):** applied as `apps/api/infra/db/migrations/032_business_code_auto_assign.sql`
  — a `BEFORE INSERT` trigger that fills `code` from
  `build_friendly_business_code(slug || name)` with collision retries, so
  `PostgresBusinessRepository.create()` no longer violates the `NOT NULL`
  constraint. This was treated as a bug fix (crashes on real Postgres today,
  not a design choice), independent of the rest of this RFC — the open
  question below about *editable* codes and where the frontend default
  comes from is still open.

## Outcome

Resolved by MP-DR-046 (draft, 2026-09-27). The DR records only the chosen
design (proposal items 1–5 above, restated as rules 1–7 in the DR); the
Alternatives section here is intentionally excluded from the DR.
