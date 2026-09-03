---
id: DR-006
title: Use scope and depends_on metadata for retrieval and review
status: accepted
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
scope: [methodology]
tags: [decision, metadata, retrieval]
depends_on: [DR-005]
related: [KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-006: Use Scope And Depends_on Metadata For Retrieval And Review

## Context

The first repository version used `tags` and `related` for discovery. Those fields did not distinguish stable retrieval scope from loose context links, and they did not tell reviewers which documents to inspect after a decision changed.

## Decision

Add `scope` to identify the domain or domains a document applies to.

Add `depends_on` to list canonical documents that should trigger review when they change.

Keep `related` for useful context that does not create a review obligation.

## Consequences

Agents and humans can retrieve documents by domain without relying on inconsistent tags. Reviewers can find downstream docs affected by a changed decision or spec.

The cost is small metadata upkeep. Authors should keep `depends_on` focused on documents that affect correctness, not background reading.

## Evaluation

- Engineering problem solved: a changed decision can point reviewers to specs, flows, IA, prompts, and tasks that may now be wrong.
- Existing concept check: `related` can link context, but it cannot distinguish background reading from review obligation.
- Complexity introduced: authors must maintain one more optional list and one required scope field.
- Value without AI: yes. Human reviewers benefit from explicit review dependencies during refactors and product changes.
