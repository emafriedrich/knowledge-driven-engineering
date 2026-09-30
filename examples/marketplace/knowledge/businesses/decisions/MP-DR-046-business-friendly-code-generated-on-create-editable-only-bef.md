---
id: MP-DR-046
title: "Business friendly code: generated on create, editable only before first order or product"
status: accepted
created: 2026-09-27
updated: 2026-09-27
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: []
related: [MP-RFC-003]
supersedes: []
superseded_by: []
---

# MP-DR-046: Business friendly code: generated on create, editable only before first order or product

## Context

`businesses.code` is a `VARCHAR(3) NOT NULL UNIQUE` prefix that
`assign_product_friendly_id` and `assign_order_friendly_id` bake into every
row's `friendly_id` at insert time (e.g. `PIZ-42`). Those triggers never
rewrite an existing `friendly_id` when `businesses.code` changes later — so
if the code is edited after history exists, the merchant ends up with two
prefixes permanently split across their catalog and order log. That is a
data-integrity problem no UX warning can undo.

The immediate NOT NULL bug on create was already fixed as a stopgap by
migration `032_business_code_auto_assign.sql` (BEFORE INSERT trigger that
fills `code` from `build_friendly_business_code(slug || name)` with
collision retries). This DR covers the design around it: what the merchant
sees at creation, whether they can change it later, and how the frontend
and backend agree on what a valid code is.

The full analysis lives in MP-RFC-003.

## Decision

1. **The create-business request always carries a `code`.** The UI defaults
   it from the business name and shows it as an editable field so the
   person creating the business can change it before submitting. If the
   request arrives without one, the backend derives it itself (reusing the
   same algorithm as the DB stopgap and the seed script — no third
   implementation).

2. **A code is exactly three ASCII uppercase letters: `^[A-Z]{3}$`.** No
   spaces, digits, symbols, accents, or ñ. The frontend input and the
   backend validator enforce the same regex and reject anything else
   outright; without a single shared rule the two ends disagree and
   validation flakes.

3. **Derivation from the name:** NFD-normalize, strip combining marks
   (ñ → n), keep only `[A-Za-z]`, uppercase, take the first three
   characters. If fewer than three survive (very short or all-symbol
   names), pad on the right with `X` to reach three — matching what
   `build_friendly_business_code` already does in SQL.

4. **Collisions are resolved server-side.** On a `code` collision (whether
   the caller submitted one or the backend derived it), the backend picks
   the next available code deterministically by walking the 3-letter space
   — the approach `allocateBusinessCode` uses in the seed script, adapted
   to check the DB rather than an in-memory set. The frontend suggestion
   is best-effort; the backend is the source of truth.

5. **`code` is editable after creation only while the business has no
   history yet** — no order has been received AND no product has been
   created. Once either exists, the field is locked: `update-business-settings`
   returns a domain error if the caller tries to change it. Editing before
   history exists is safe because nothing references the old code.

6. **`code` edits use the same capability as other business settings:
   `business.configure` (MP-DR-004).** No separate guard; the history-lock in
   rule 5 already contains the risk, so the capability doesn't need to be
   narrower.

7. **The code input in the admin/merchant UI shows a prominent banner
   explaining the one-shot nature, but ONLY when the business still has no
   orders and no products** — i.e. only while editing is actually allowed.
   Copy along the lines of: *"Podés cambiar el código sólo hasta que
   recibas el primer pedido o cargues el primer producto. Después queda
   fijo para siempre porque forma parte de los identificadores de tus
   pedidos y productos."* Once history exists, the banner is not shown
   (there is nothing to warn about) and the input is rendered as
   read-only/disabled with a short inline note ("El código no se puede
   cambiar una vez que hay pedidos o productos"). The "has history"
   signal comes from the same server check that gates the update, exposed
   on the business settings payload so the UI doesn't guess.

## Consequences

- `CreateBusinessParamsInput` gains a `code` field, defaulted client-side
  from the name using the rule 3 derivation and validated with the rule 2
  regex on both ends.
- `deriveBusinessCode`/`allocateBusinessCode` move out of
  `apps/api/infra/db/seeds/generate-storefront-seed.ts` into a shared
  module the seed, `BusinessService`, and the create/update actions all
  import.
- `update-business-settings` gains a `code` field, gated by the
  history-lock in rule 5 and validated with the rule 2 regex.
- The business settings payload exposes a boolean like
  `codeIsEditable` (derived from "no orders AND no products yet") so the
  UI can render the banner + input state without guessing.
- Migration `032_business_code_auto_assign.sql` remains as a defense in
  depth: the trigger keeps working when the backend forgets to derive one.
- No effect on existing `friendly_id`s — those stay frozen by design; the
  history-lock exists precisely to keep them coherent.

## Supersession

Resolves MP-RFC-003.
