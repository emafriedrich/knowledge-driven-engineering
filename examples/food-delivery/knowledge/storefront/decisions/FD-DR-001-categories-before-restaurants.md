---
id: FD-DR-001
title: Show categories before restaurants on the storefront
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [product, design, engineering]
scope: [storefront]
tags: [decision, discovery]
depends_on: [FD-RFC-001, FD-PV-001]
related: [FD-IA-001, FD-FLOW-001, FD-SPEC-001]
supersedes: []
superseded_by: []
---

# FD-DR-001: Show Categories Before Restaurants On The Storefront

## Context

The product vision prioritizes intent-first discovery. The accepted RFC concluded that category entry gives customers a clearer starting point than scanning restaurants.

## Decision

The storefront must show food categories before the restaurant list.

Category selection should lead customers to a category-scoped restaurant list. The product may implement that as inline filtering or navigation, but the user must retain a clear path back to all restaurants.

## Consequences

The storefront information architecture changes. The UX flow gains category selection before restaurant selection. The implementation spec must define loading, empty, and selection behavior.
