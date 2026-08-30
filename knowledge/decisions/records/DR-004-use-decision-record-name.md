---
id: DR-004
title: Use Decision Record as the general decision artifact name
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
tags: [methodology, decisions]
related: []
supersedes: [DR-001]
superseded_by: []
---

# DR-004: Use Decision Record as the general decision artifact name

## Context

The methodology needs to record decisions outside architecture. `ADR` is familiar but too narrow for product, UX, design, security, infrastructure, and business-rule decisions.

## Decision

Use `Decision Record` as the canonical artifact name. Teams may mention `ADR` as a synonym when talking to engineers who already know the pattern.

## Consequences

The artifact name matches the intended scope. Existing ADR habits still transfer because the record shape remains familiar.

## Supersedes

This record supersedes [DR-001](DR-001-use-adr-name.md).

