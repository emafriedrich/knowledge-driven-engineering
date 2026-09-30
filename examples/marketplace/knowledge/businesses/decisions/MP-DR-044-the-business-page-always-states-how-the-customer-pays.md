---
id: MP-DR-044
title: The business page always states how the customer pays
status: accepted
created: 2026-09-26
updated: 2026-09-27
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision, payments, storefront]
depends_on: [MP-DR-009]
related: [MP-DR-009]
supersedes: []
superseded_by: []
---

# MP-DR-044: The business page always states how the customer pays

<!-- Primary question: What important decision did we make and why? -->

## Context

The platform has no payment integration: the customer pays the merchant
directly with whatever the merchant accepts (cash on delivery or pickup, card
on the merchant's own POS, transfer to the merchant's alias/CBU). The accepted
methods are configured per business (MP-DR-009).

Until now the customer only learned this at checkout step 3 ("Le pagás
directamente al comercio, con los medios que acepta."). Someone deciding
whether to order from a business needs to know before building a cart that
there is no online payment and which methods the merchant takes; finding out
at the last step reads as a surprise and costs abandoned carts.

## Decision

1. The storefront business page always states how the customer pays, near the
   facts line of the header (delivery estimate, delivery fee, minimum,
   closing time), visible without opening any disclosure, on mobile and
   desktop alike.
2. The notice lists the business's accepted methods from its MP-DR-009
   configuration, in checkout order and with the same labels as checkout, as
   a natural es-AR list: "Le pagás al local: efectivo, transferencia o
   tarjeta".
3. When the business has no methods configured the notice is still shown, as
   "Le pagás directamente al local." It is never omitted.
4. The notice never claims "sin comisión" or "sin intermediarios": the
   platform charges commission on marketplace orders from new customers.

## Consequences

- The storefront business payload already carries `acceptedPaymentMethods`
  (MP-DR-009); no API change was needed. The copy lives in one helper,
  `getPaymentNotice` (apps/storefront/src/features/storefront/checkout/payment-methods.ts),
  next to the checkout labels so both stay in sync.
- Checkout keeps its own step-3 copy; the business page states the same rule
  earlier, it doesn't replace it.
- A merchant who configures no methods gets the generic notice rather than a
  list; the MP-DR-009 validation (non-empty subset) makes that an edge case.

## Supersession

<!-- If this replaces another decision, link it here and update the old record. -->
