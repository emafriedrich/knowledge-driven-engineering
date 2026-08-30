---
id: FD-RFC-001
title: Show food categories before restaurants on the storefront
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [product, design, engineering]
tags: [food-delivery, storefront, discovery]
related: [FD-PV-001, FD-DR-001]
---

# RFC: Show Food Categories Before Restaurants On The Storefront

## Summary

Show food categories before the restaurant list so customers can begin with meal intent.

## Problem

The current storefront starts with restaurants. Customers who have a food type in mind must scan restaurant names and infer cuisines.

## Proposal

Place a category section above the restaurant list. Selecting a category filters or navigates to restaurants that serve that food type.

## Alternatives

- Keep restaurants first and add cuisine badges to each card.
- Put search first and rely on user-entered category terms.

## Open Questions

- Should category selection navigate to a dedicated results page or filter inline?
- How many categories should appear before overflow?

## Outcome

Accepted. See [FD-DR-001](../decisions/FD-DR-001-categories-before-restaurants.md).

