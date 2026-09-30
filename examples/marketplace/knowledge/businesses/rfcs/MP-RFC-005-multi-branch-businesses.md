---
id: MP-RFC-005
title: Multi-branch businesses
status: draft
created: 2026-09-24
updated: 2026-09-24
authors: [emafriedrich]
drafted_by: agent
approved_by: []
motivated_by: "docs/sistema/businesses.md: no multi-branch support; business_events.branch_id exists but is always null"
scope: [businesses]
tags: [rfc]
depends_on: []
related: [MP-DR-009, MP-DR-030, MP-DR-033, MP-DR-034, MP-DR-035, MP-DR-036]
---

# RFC: Multi-branch businesses

> **Priority: none (backlog).** This RFC records the design and its
> technical implications so they aren't lost; there is no date or
> implementation commitment. None of this is current truth until a DR
> decides it.

## Summary

Today a business is a single location: one address, one lat/lng pair, one
schedule, one open switch, and one delivery fee, all hanging off
`businesses`. A brand with two locations (e.g. "Pizzeria X Downtown" and
"Pizzeria X Villa Sarita") has to sign up as two separate businesses, with
two catalogs, two logins, and two customer histories.

The proposal is to separate **brand** (`businesses`, the tenant: identity,
catalog, users, billing) from **branch** (`branches`: the physical and
operational side: address, schedule, open/closed, delivery, stock, cash
register). Every existing business gets a default branch, so the
single-branch case changes nothing for the merchant or the customer.

## Problem

The only trace of multi-branch in the code is the `business_events.branch_id`
column (`008_create_business_events.sql:4`), which is always inserted as
`null` (`apps/api/infra/http/routes/admin/saas/saas.routes.ts:75`,
`apps/api/infra/http/routes/admin/auth/auth.routes.ts:54`). There is no table
or concept of a branch (`docs/sistema/businesses.md`, "What it does NOT do").

What is "per business" today and would be "per branch" in a multi-branch
model:

- **Location and delivery** — `address`, `latitude`/`longitude`,
  `delivery_fee`, `min_order`, `estimated_delivery` on `businesses`
  (`002_create_businesses_products.sql:3-21`).
- **Schedule and open/closed** — `business_schedules.business_id`
  (`002:25`), `businesses.is_open`; MP-DR-033/MP-DR-034 turn these into the rule
  that blocks orders.
- **Orders** — `orders.business_id` (`004_create_orders.sql:4`).
- **Delivery personnel** — `delivery_personnel.business_id`
  (`021_create_delivery_personnel.sql:5`).
- **Stock/availability** — option inventory
  (`013_add_product_option_inventory_and_category_assignments.sql`) and the
  MP-DR-029 rule: one branch can run out of mozzarella while the other doesn't.
- **Cash register** — MP-DR-005 (register session with an owner) is inherently
  per physical branch.

And what naturally stays "per brand":

- Catalog: `product_categories.business_id` (`002:37`),
  `products.business_id` (`002:49`), option groups, labels.
- Identity: name, slug, logo, cover image (MP-DR-036 `profile_draft`).
- Users: `users.business_id` (`006_add_business_access_to_users.sql:2`).
- 3-letter friendly code: `businesses.code`
  (`014_add_friendly_ids_for_orders_and_products.sql:1-13`), used by the
  trigger that builds `CODE-123` for products and orders (`014:40-64`).
- Payment methods (MP-DR-009, `023_add_business_payment_methods.sql`) —
  debatable, see Open Questions.
- SaaS plan and billing: `saas_revenue_config.monthly_price_per_business`
  (`011_add_saas_revenue_config.sql:6-11`).

## Proposal

### Model

```
businesses (brand / tenant)          branches (branch)
  id, slug, name, code, logo, ...  ──<  id, business_id, name, slug_suffix?
  lifecycle_status (MP-DR-036)             address, latitude, longitude
  payment methods (MP-DR-009)              delivery_fee, min_order, estimated_delivery
  catalog, users, plan                  is_open (manual switch, MP-DR-034)
                                        is_active
                                   branch_schedules (formerly business_schedules)
                                   branch_product_availability (overrides)
```

1. **New `branches` table** with everything physical/operational that
   currently lives on `businesses`. `businesses` keeps identity, catalog,
   users, payments, and billing.
2. **`business_schedules` becomes `branch_schedules`** (`branch_id` instead
   of `business_id`), with the same MP-DR-033 rules. MP-DR-034's `acceptingOrders`
   is computed **per branch**.
3. **Catalog shared at the brand level.** Products, categories, and options
   keep `business_id`. Each branch can override:
   - availability/stock (`branch_product_availability`: `branch_id`,
     `product_id`/`option_id`, `is_available`, `stock`) — required for
     MP-DR-029 to make sense per branch;
   - price (optional, later phase; complicates snapshots and MP-DR-028).
4. **Orders per branch.** `orders.branch_id NOT NULL` in addition to
   `business_id` (kept for brand-level queries and for the friendly-id
   trigger). Checkout validates against the chosen branch.
5. **Delivery personnel and cash register per branch**:
   `delivery_personnel.branch_id`, MP-DR-005 register sessions with
   `branch_id`.
6. **`business_events.branch_id`** starts being populated when the event is
   operational for a branch; `null` still means "brand-level event".

### Migration (frictionless path)

1. Create `branches` and, for each business, **one default branch** copying
   address, coordinates, delivery, `is_open`.
2. Move `business_schedules` → `branch_schedules` pointing at that branch.
3. Add `branch_id` to `orders`, `delivery_personnel`, and cash register,
   backfilled with the default branch; then `NOT NULL`.
4. Remove the moved columns from `businesses` (if there is still no
   production data, no compatibility period is needed; if there is, migrate
   in two steps).
5. UI: if a business has **one** branch, the admin and storefront don't show
   the concept (no selector, no "branches" in the menu). It only appears
   once there's a second one.

### Implications by domain

| Domain / piece | Today | With branches |
| --- | --- | --- |
| Storefront `/[slug]` | one page per business | brand page; with 2+ branches, the customer picks a branch (or the nearest one / one that delivers to their address is suggested) before building the cart; cart tied to `branch_id` |
| Discovery / map | one pin per business (lat/lng from `businesses`) | one pin per active branch; the card groups by brand; "open now" filter per branch |
| Checkout (`orders/business-checkout-policy.ts`) | reads the business's policy | reads delivery, minimum, and `acceptingOrders` from the branch; payments from the brand (or the branch, see OQ) |
| Schedule / open (MP-DR-033, MP-DR-034) | per business | per branch; the "Ahora está cerrado" notice is for the chosen branch |
| Draft / live (MP-DR-036) | per business | `lifecycle_status` and `profile_draft` stay on the brand; a new branch is born inactive and the "go live" checklist requires at least one complete branch |
| Reactivate / deactivate (MP-DR-035, MP-DR-030) | per business | deactivating the brand = everything; plus `branches.is_active` to close one branch permanently without touching the others |
| Stock and availability (MP-DR-029) | per product/option | per branch via overrides; editing an order revalidates against that order's branch stock |
| Prices (MP-DR-028, snapshots `012`) | per product | no change in phase 1; per-branch pricing only if decided, and the item snapshot already freezes the price charged |
| Friendly IDs (`014`) | `CODE-123`, sequence per business | stays per brand (a single counter); optional branch suffix in UI only |
| Attribution / commission (MP-DR-008, `019`) | `is_new_customer` by `(business_id, customer_phone_normalized)` (`019:74-75`) | **must stay per brand**: a customer who already bought at Downtown is not "new" at Villa Sarita; the index stays the same |
| Users and permissions (MP-DR-004) | `users.business_id`, capabilities per business | add optional per-branch scope (`user_branches`); owner sees all, staff/cashier only theirs; `authorize` receives `branchId` |
| Delivery personnel (`021`, MP-DR-010/MP-DR-013) | per business | per branch (or shared by brand with assignment) |
| Cash register (MP-DR-005) | per business | per branch, mandatory |
| Analytics | per business | branch filter + brand total; `business_events.branch_id` starts to carry a value |
| SaaS / billing (`011`) | `monthly_price_per_business` | decide whether to bill per brand or per branch |
| Messaging (MP-DR-006 WhatsApp) | one number per business | phone/WhatsApp per branch; the order message comes from the branch |
| Errors (MP-DR-021, MP-DR-023) | `businesses.*`, `orders.*` | new `businesses.branch_*` (not_found, inactive) and `orders.branch_closed` |

### Estimated cost

This is a cross-cutting refactor: it touches migrations,
`business-repository`, `BusinessService`, checkout, orders, discovery,
storefront, admin (settings gets a "brand" and "branch" split),
authorization, and analytics. Doing it **before** there is real data is
considerably cheaper than after; doing it without concrete demand is
over-engineering. That's why it stays in the backlog.

## Alternatives

- **Separate businesses grouped by a `business_group_id`.** Each branch is a
  full `business` and a group ties them together for login and reports.
  Minimal change, but it duplicates the catalog (edit a price N times),
  breaks new-customer attribution across branches, and multiplies slugs and
  codes. Rejected except as a temporary patch.
- **Branch as informational data only** (several addresses on the profile,
  a single schedule and a single stock). Does not solve schedule, stock, or
  cash register per branch; not worth it.
- **Do nothing** and have each branch sign up as a separate business. This
  is the current situation; acceptable as long as no brand has more than
  one branch.

## Open Questions

1. Payment methods and transfer details (MP-DR-009) per brand or per branch?
   (Each branch may have its own terminal/account.)
2. Price per branch in phase 1, or only availability/stock?
3. SaaS billing per brand or per branch? Affects `saas_revenue_config` and
   MP-DR-008.
4. In the storefront with 2+ branches: does the customer pick the branch, or
   is it auto-assigned by address/delivery zone? Today there are no
   delivery zones, only a fixed `delivery_fee`.
5. Does a branch have its own slug (`/pizzeria-x/downtown`) for QR and
   social media?
6. Delivery personnel shared across branches of the same brand?
7. Does the merchant's order view mix branches, or does it start filtered by
   the user's branch?

## Outcome

Pending. No priority; revisit when a merchant with more than one branch
shows up.
