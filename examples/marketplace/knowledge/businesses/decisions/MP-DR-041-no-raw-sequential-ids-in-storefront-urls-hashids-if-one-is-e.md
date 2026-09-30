---
id: MP-DR-041
title: No raw sequential ids in storefront URLs; hashids if one is ever added
status: accepted
created: 2026-09-26
updated: 2026-09-26
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: []
related: []
supersedes: []
superseded_by: []
---

# MP-DR-041: No raw sequential ids in storefront URLs; hashids if one is ever added

<!-- Primary question: What important decision did we make and why? -->

## Context

Audited every storefront-facing URL that carries a business identifier,
as part of [[MP-DR-040]] (which does the same for orders):

- `apps/storefront/app/checkout/page.tsx` — `?businessId=<uuid>` query
  param (fallback used when the cart hasn't hydrated yet).
- `apps/api/infra/http/routes/storefront.routes.ts` —
  `GET /:businessId/categories` and `GET /:businessId/products`, the
  public catalog fetch routes.

Both carry `businesses.id`, a `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
since migration 002 — never a sequential integer. The only other
business-facing identifier, `businesses.code` (MP-RFC-003), is a 3-letter
code derived from the business name with a collision-retry suffix, not a
counter, and it doesn't appear in any URL today — only inside
`orders.friendly_id` (see [[MP-DR-040]]).

So there is no raw sequential id exposed in a storefront URL for this
domain today. A UUID isn't next-guessable the way an autoincrement is,
and hashids has nothing to add to a value that's already a UUID — hashids
encodes small integers, not 128-bit ids.

## Decision

1. No change to what's on the wire today: the business UUID stays as-is
   in the checkout query param and the public catalog routes.
2. The rule is codified for later instead: no numeric/sequential business
   identifier is ever placed in a storefront-facing URL in raw form. If
   one is ever introduced (a short numeric referral/invite code, a public
   counter, etc.), it must be hashids-encoded exactly like [[MP-DR-040]] —
   same shared codec, same `HASHIDS_SALT` env var (never hardcoded, app
   fails loudly if it's unset), same fail-loud rule. This record exists so
   that decision isn't re-litigated later, and so a future "add a
   friendly business number" feature doesn't quietly reopen the
   enumeration [[MP-DR-040]] just closed for orders.

## Consequences

- No code ships from this record by itself.
- Any future work that adds a numeric, business-facing identifier to a
  URL must point back here instead of picking its own approach.

## Supersession

None.
