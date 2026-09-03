---
id: DR-002
title: Use a decision index for current truth
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
scope: [methodology]
tags: [decision, agents]
depends_on: []
related: []
supersedes: []
superseded_by: []
---

# DR-002: Use a decision index for current truth

## Context

Decision Records preserve history. Staff Engineers and agents also need a cheap way to find the current decision for a domain without scanning every record.

## Decision

Use `decisions/index.yaml` inside each knowledge domain as a projection of active decisions. The index maps stable topic keys to active Decision Record IDs.

## Consequences

Readers can find current decision state by domain. Rationale stays in the Decision Record, so the index remains small and low maintenance.
