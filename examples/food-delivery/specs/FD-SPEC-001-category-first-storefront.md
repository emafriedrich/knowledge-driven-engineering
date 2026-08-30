---
id: FD-SPEC-001
title: Category-first storefront behavior
status: current
created: 2026-08-30
updated: 2026-08-30
authors: [product, design, engineering]
tags: [food-delivery, storefront, spec]
related: [FD-DR-001, FD-IA-001, FD-FLOW-001]
---

# Category-First Storefront Behavior

## Scope

This spec covers storefront discovery order and category selection behavior. It does not define visual styling or restaurant ranking.

## Required Behavior

- The storefront must render the food category section before the restaurant list.
- Category labels must describe food types, not restaurant names.
- Selecting a category must show restaurants that match that category.
- Customers must have a visible way to return to the unfiltered restaurant list.
- The restaurant list must remain available when the customer does not select a category.
- If categories cannot load, the storefront must still show restaurants.
- If a category has no restaurants, the storefront must show an empty state and a route back to all restaurants.

## Constraints

- Category loading must not block initial restaurant-list rendering for more than the product's normal loading budget.
- Category selection must preserve the current delivery context.
- Analytics should distinguish category-started discovery from restaurant-list discovery.

## Acceptance Checks

- A customer can open the storefront and see categories before restaurants.
- A customer can select a category and see only matching restaurants.
- A customer can clear category selection.
- A category-load failure still leaves restaurant discovery usable.

