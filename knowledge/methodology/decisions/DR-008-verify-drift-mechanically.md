---
id: DR-008
title: Verify knowledge drift mechanically
status: accepted
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, validation]
depends_on: []
related: [KDE-RFC-002, DR-006, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-008: Verify Knowledge Drift Mechanically

## Context

The validator verified the knowledge graph, not its drift against time and code. Review step 4 of change propagation ("review dependents of a changed record") had no enforcement. KDE-RFC-002 proposed crude, deterministic drift checks and was accepted.

## Decision

- **Staleness by dates**: if X `depends_on` Y and Y `updated` is later than X `updated`, the validator warns. Clearing the warning means re-reviewing X and bumping its `updated` date. Warnings, not errors.
- **Code-to-domain map**: domain entries in `knowledge/index.yaml` may declare `code_paths`, plain repository path prefixes (not globs) of the implementation the domain governs.
- **Retrieval bundles are generated**: `knowledge:context <path-or-domain>` resolves the governing domain and prints the retrieval bundle; its output is the context receipt of DR-007's Gate 5.
- **PR drift gate**: CI maps changed files to domains via `code_paths`. If a mapped domain has a current spec and the PR touches no knowledge document of that domain, the PR body must contain `no-behavior-change`. One prefix may map to several domains; each must be satisfied.

## Consequences

- `depends_on` becomes an executable review signal; expect staleness warnings whenever a decision or spec is updated, by design.
- Domains should declare `code_paths` as they stabilize; unmapped code is invisible to the drift gate.
- Monorepo prefix composition stays open until dogfooding surfaces the real shape.
- Semantic drift detection (embeddings, LLM judge) stays rejected until these crude checks prove insufficient.
