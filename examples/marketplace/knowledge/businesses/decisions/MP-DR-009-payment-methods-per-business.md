---
id: MP-DR-009
title: Accepted payment methods are configured per business and enforced at checkout
status: accepted
created: 2026-09-18
updated: 2026-09-18
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

# MP-DR-009: Accepted payment methods are configured per business and enforced at checkout

## Context

Orders already record a `payment_method` (`cash`, `transfer`, `card`), but the
storefront offers all three for every business with generic copy ("you pay by
card on delivery"). Nothing states that a given merchant actually owns a card
terminal or accepts transfers. That violates the vision's honesty principle:
the UI promises something no data backs. The product owner decided on
2026-09-18 that payment methods must be modeled per business.

## Decision

1. **Each business declares its accepted payment methods**, a non-empty subset
   of `cash`, `transfer`, `card`. The platform does not process payments:
   `card` means the merchant charges with their own terminal at delivery or
   pickup; `transfer` means the customer transfers to the merchant directly.
2. **Transfer details are explicit merchant data**: an optional transfer alias
   or CBU/CVU and account holder name. They are shown to the customer only
   after choosing transfer (checkout and confirmation). If a business accepts
   transfers without details, the storefront says the merchant will send them,
   and nothing more.
3. **The storefront offers only the accepted methods** of the business being
   ordered from, using copy derived from this configuration.
4. **The API is authoritative**: order creation rejects a payment method the
   business does not accept. The storefront list is a convenience, not the
   enforcement point.
5. **Configuration belongs to business settings** and requires the
   `business.configure` capability (MP-DR-004).
6. **Default for every business, existing and new, is `cash` and `transfer`**
   (product-owner decision, 2026-09-18: accepting transfers is standard
   practice in Argentina). `card` is opt-in because it depends on the merchant
   owning a terminal.
7. **Optional transfer surcharge**: a business may configure a percentage added
   to orders paid by transfer. It is always 0 by default and never applies to
   other payment methods. The API computes it on the order subtotal, snapshots
   the amount on the order, and adds it to the total; the storefront shows it
   as its own line before the customer confirms. The MP-DR-008 commission basis
   and the analytics revenue figure remain the subtotal, without surcharge.

## Consequences

- Orders gain a snapshotted payment surcharge amount; the order total becomes
  subtotal + delivery fee + payment surcharge.

- New business columns and settings UI; the public business payload exposes
  accepted methods and, for transfer, the transfer details.
- Checkout validation gains a business-level rule and a specific error the
  storefront can render.
- Per-fulfillment-type restrictions (for example "card only on pickup") and
  online payment processing are out of scope and would need a new decision.

## Supersession

None.
