---
id: DR-005
title: Organize canonical knowledge by domain first
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
scope: [methodology]
tags: [decision, retrieval]
depends_on: [DR-002]
related: [KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-005: Organize Canonical Knowledge By Domain First

## Context

The first repository version organized canonical knowledge by artifact type: product, decisions, design, engineering, and prompts. That protected artifact boundaries, but it made retrieval start from document category instead of the work area.

A storefront change should not require a reader to search unrelated product, design, and engineering folders before finding the current storefront spec and active decisions.

## Decision

Organize canonical knowledge by domain first. Inside each domain, use artifact folders only when the domain has real content for that artifact type.

The root `knowledge/index.yaml` catalogs domains and current anchor artifacts.

## Consequences

Readers and agents can start from the affected domain, then retrieve the minimum canonical context for the change. Cross-domain work still requires explicit review across affected scopes.

This introduces small upkeep for domain indexes. The retrieval benefit outweighs that cost for products with multiple capabilities or system areas.

## Evaluation

- Engineering problem solved: contributors can find current knowledge for a work area without scanning global artifact folders.
- Existing concept check: `tags` and artifact folders help classification, but they do not provide a stable entry point for work.
- Complexity introduced: each domain needs a README or index and local artifact folders.
- Value without AI: yes. Human engineers also reason from product and system areas before they reason from document type.
