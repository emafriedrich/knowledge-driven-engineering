---
id: MP-DR-023
title: Businesses and SaaS console errors carry stable codes
status: accepted
created: 2026-09-22
updated: 2026-09-22
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

# MP-DR-023: Businesses and SaaS console errors carry stable codes

## Context

MP-RFC-002 (accepted 2026-09-22) moves every API error to a stable string code
with Spanish copy in the front; MP-SPEC-003 fixes the shape; MP-DR-020 applied it
to products. This record applies it to the rest of this domain.

Businesses covers the public storefront lookups, the merchant settings
(including MP-DR-009 payment settings) and the SaaS console's business
management. The SaaS routes were the last place in the API writing user copy:
eleven hand-written Spanish bodies with no code.

## Decision

1. **Every error of this domain has a string code**, declared once in the
   domain's `error-codes.ts`, listed in `packages/types/src/errors.ts`, and
   referenced as `key` next to the legacy numeric `code` in each action's
   error definitions:

   | Code | Raised when | Legacy |
   |---|---|---|
   | `businesses.invalid_payload` | a settings, create, lookup, deactivate or storefront-status request fails validation | 1, 3001, 3002, 3004, 3101, 3201 |
   | `businesses.not_found` | the business does not exist | 2, 3003, 3005, 3102, 3202 |
   | `saas.request_failed` | a SaaS console route fails unexpectedly | — |
   | `saas.revenue_values_negative` | a revenue target or price is negative | — |
   | `saas.commission_out_of_range` | the marketplace commission is not an integer 0-10000 bps (MP-DR-008) | — |

2. **The HTTP body follows MP-SPEC-003.** Routes serialize every action result
   through `toApiBody`: the string code as `code`, the old number as
   `legacy_code` (rule 4), and the params issues as `errors`.
3. **Field issues of a validation refusal carry `businesses.field_required`,
   `businesses.field_invalid`, `businesses.field_out_of_range`,
   `businesses.field_too_long` or `businesses.transfer_disabled` according to the reason the params class
   records next to the rule (`FieldIssueReasons` in `lib/params.ts`), plus
   the field's Spanish `label` from `infra/http/api-body.ts`.**
4. **HTTP status is chosen by code, never by number.** Routes compare
   `result.key` against the domain constants.
5. **The API writes no Spanish.** Every `message` of this domain is English
   developer text; the admin and storefront render `error-copy.ts`.

## Consequences

- Transfer details sent while transfers are off get
  `businesses.transfer_disabled`, so the copy tells the merchant to turn
  transfers on instead of calling the value invalid.
- The SaaS route messages are rewritten in English; their Spanish sentences
  live in `error-copy.ts`. This closes MP-DR-020 rule 6.
- `saas` is its own namespace: the console is a platform surface, not a
  merchant one.
- `legacy_code` can be dropped once no client reads it; none does today.

## Supersession

None.
