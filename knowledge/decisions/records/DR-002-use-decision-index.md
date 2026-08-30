---
id: DR-002
title: Use a decision index for current truth
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
tags: [methodology, decisions, agents]
related: []
supersedes: []
superseded_by: []
---

# DR-002: Use a decision index for current truth

## Context

Decision Records preserve history. Agents and contributors also need a cheap way to find the current decision without scanning every record.

## Decision

Use `knowledge/decisions/index.yaml` as a projection of active decisions. The index maps stable topic keys to active Decision Record IDs.

## Consequences

Readers can find current decision state quickly. Rationale stays in the Decision Record, so the index remains small and low maintenance.

