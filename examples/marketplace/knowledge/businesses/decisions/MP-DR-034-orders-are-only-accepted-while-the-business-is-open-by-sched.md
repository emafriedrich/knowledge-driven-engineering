---
id: MP-DR-034
title: Orders are only accepted while the business is open by schedule and by its manual switch
status: accepted
created: 2026-09-24
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: [MP-DR-033]
related: [MP-DR-030]
supersedes: []
superseded_by: []
---

# MP-DR-034: Orders are only accepted while the business is open by schedule and by its manual switch

## Context

Today "open/closed" is only the manual `business.isOpen` flag. The weekly
schedule is informative ("cierra a las HH:MM") and never blocks anything
(`docs/sistema/businesses.md`, "El horario es informativo"). Worse, checkout
does not check `isOpen` either: `BusinessServiceCheckoutPolicyReader` only
rejects inactive businesses, so a closed business still receives orders if the
customer reaches the cart. A customer can order at 3 a.m. from a place that
closed at midnight, and the merchant finds it in the morning. That is a broken
promise to both sides.

The product owner decided on 2026-09-24 to block orders outside business hours
and to tell the customer clearly, on the business page, that it is closed now.
MP-DR-033 makes the schedule editable so it can carry that weight.

**Revision note (2026-09-25, edited in place after acceptance, pre-launch):**
reconciled with MP-DR-030 point 2 and MP-SPEC-005/MP-SPEC-006. Rule 1 now names the
computed value `availability`; rules 5 and 6 defer the customer-facing display
to MP-DR-030 and MP-SPEC-006 (manual closure promises no time at all; the storefront
never computes the status itself; products of closed businesses are hidden
from discovery). Schedule evaluation covers split shifts (MP-DR-033 rule 3).

## Decision

1. **Whether the business accepts orders is computed, not stored**, as a
   single `availability` value — `{ status, nextOpensAt }` with `status` one
   of `open`, `closed_by_schedule`, `closed_by_merchant` (exact shape in
   MP-SPEC-005). There is no separate `acceptingOrders` boolean alongside it.
   - It is `open` only when the business is active (MP-DR-030 point 1), the
     manual switch `isOpen` is on, and `scheduleOpenAt(now)` holds.
   - `scheduleOpenAt(now)` is true when `now` falls inside any of today's
     ranges, or inside yesterday's last range if that range crosses midnight
     (MP-DR-033 rules 3–4). A day with no ranges never matches.
   - When closed, `closed_by_merchant` wins over `closed_by_schedule` if both
     apply (MP-DR-030 point 2).
   - `isOpen` stays as a manual switch, but it can only **close** the business
     ("cerramos por hoy", lluvia, sin insumos). It cannot open it outside the
     schedule; to open extra hours the merchant edits the schedule.
2. **The API enforces it at checkout.** Order creation rejects a business that
   is not accepting orders with a stable code in the `orders.*` namespace
   (MP-DR-021): `orders.business_closed`, HTTP `409`, with `reason` =
   `closed_by_schedule` or `closed_by_merchant`, plus `nextOpensAt` (ISO
   datetime, or `null` when the week has no open day). The storefront check is
   convenience only; the server is the authority.
3. **One platform timezone.** `now` and all schedule times are evaluated in
   `America/Argentina/Buenos_Aires` (UTC−3, no DST),
   declared once as a platform constant and used by both API and storefront.
   Never the server clock's local zone, never the browser's.
4. **Only creation is blocked.** Orders already created keep their normal
   lifecycle after closing time; editing an existing order follows its own
   rules (MP-DR-028/MP-DR-029), not this one. The check runs at submit time: a cart
   opened at 23:58 and submitted at 00:01 is rejected.
5. **The customer is told before the cart, not after.** A closed business's
   page shows a prominent banner at the top; the menu stays browsable and
   add-to-cart and checkout are disabled. What it says, and how closed
   businesses appear in listings and search, is decided in MP-DR-030 point 2 and
   specified in MP-SPEC-006. In short: closed by schedule says when it opens
   next; closed by the merchant says only that it's temporarily unavailable,
   with no time promised.
6. **The storefront never computes the status.** It renders the
   `availability` sent by the API (MP-DR-002); listings, search, the business
   page and checkout all show the same value, so they never contradict each
   other.

## Consequences

- Implementation is specified in MP-SPEC-005 (API: `getBusinessAvailability`,
  checkout gate, `orders.business_closed` with `reason` and `nextOpensAt`)
  and MP-SPEC-006 (storefront display).
- Admin: settings makes the effect visible ("Tu negocio está recibiendo
  pedidos" / "Cerrado por horario hasta las 20:00" / "Cerrado manualmente").
- `docs/sistema/businesses.md` rule "El horario es informativo" and the "No hay
  apertura/cierre automático" bullet become obsolete; `knowledge/orders`
  gains the new error code (MP-DR-021 table).
- Reconciled with MP-DR-030 on 2026-09-25: `isOpen` keeps its meaning as the
  merchant's switch; "open" as seen by customers is
  `availability.status = 'open'`.
- Requires MP-DR-033: with every new business starting closed all week, nobody
  can order until the merchant sets hours — intended.
- **Out of scope, needs a new decision:** scheduled orders ("pedir para las
  21:00" while closed), a cut-off before closing time (e.g. stop taking orders
  15 minutes before), per-business timezone, holidays.

## Supersession

None. Changes behavior documented in `docs/sistema/businesses.md` ("El horario
es informativo; abierto/cerrado es un flag manual"), which was never a
recorded decision.
