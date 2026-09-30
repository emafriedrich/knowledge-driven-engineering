---
id: MP-DR-053
title: Backfill baseline for businesses
status: draft
created: 2026-09-29
updated: 2026-09-29
drafted_by: agent
approved_by: []
scope: [businesses]
tags: [decision, backfill]
depends_on: []
related: []
supersedes: []
superseded_by: []
---
# MP-DR-053: Backfill baseline for businesses

## Context

KDE was adopted after this domain's code was already in production, so its
rules existed only in implementation. A backfill session is
recovering them: an agent audits the code and presents each rule with its
evidence, and a human approves or rejects it on sight.

## Decision

The rules recovered by backfill and approved by a human describe the system's
observed behavior at the time KDE was adopted, and are adopted as current
truth. Historical rationale was not recovered and is not reconstructed: where
a why matters, it gets its own Decision Record.

## Consequences

- Backfilled specs anchor to this record through depends_on, one spec per feature.
- A rule whose evidence does not convince the reviewer is rejected or edited, never approved with a caveat.
- Architectural stances recovered by the session become their own Decision Records instead of specs.

## Supersession

<!-- If this replaces another decision, link it here and update the old record. -->
