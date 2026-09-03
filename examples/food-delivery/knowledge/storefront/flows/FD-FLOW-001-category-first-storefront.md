---
id: FD-FLOW-001
title: Category-first storefront user flow
status: current
created: 2026-08-30
updated: 2026-08-30
authors: [design, product]
scope: [storefront]
tags: [flow, discovery]
depends_on: [FD-DR-001, FD-IA-001]
related: [FD-DR-001, FD-IA-001, FD-SPEC-001]
---

# Category-First Storefront User Flow

## Flow

```mermaid
flowchart TD
    Open[Customer opens storefront] --> SeeCategories[Customer sees food categories]
    SeeCategories --> Choose{Customer chooses a category?}
    Choose -->|Yes| CategoryResults[Storefront shows restaurants for that category]
    Choose -->|No| AllRestaurants[Customer scrolls to all restaurants]
    CategoryResults --> SelectRestaurant[Customer selects a restaurant]
    AllRestaurants --> SelectRestaurant
    SelectRestaurant --> Menu[Customer views menu]
```

## Recovery Paths

- If a selected category has no restaurants, show an empty state with a route back to all restaurants.
- If categories fail to load, keep the restaurant list usable.
