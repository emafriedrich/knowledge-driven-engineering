---
id: KDE-RFC-002
title: Drift verification between knowledge, code, and time
status: implemented
created: 2026-08-31
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: External repository review (2026-08-31) found the validator verifies the knowledge graph but not drift against code or time
scope: [methodology]
tags: [rfc, validation]
depends_on: [KDE-SPEC-001]
related: [DR-006, KDE-RFC-001]
---

# RFC: Drift verification between knowledge, code, and time

## Summary

Add mechanical drift detection: stale documents relative to their dependencies, a code-to-domain map, a retrieval bundle command, and a CI gate that ties code changes to knowledge changes.

## Problem

The validator verifies the knowledge graph, not its content. Step 4 of change propagation ("review documents that depend on the changed record") is the step teams never perform, and nothing enforces it. A spec can become semantically obsolete against a newer decision, and code can diverge from its spec, while every link check stays green. Without enforcement this method degenerates into the stale documentation it is designed to prevent.

## Proposal

### 1. Staleness check by dates

If document X lists Y in `depends_on` and Y `updated` is later than X `updated`, the validator warns: X may be stale relative to Y. This uses only metadata that already exists (DR-006), works without CI history, and converts `depends_on` from declared intent into an executable review signal. Clearing the warning requires a human to re-review X and bump its `updated` date — which is exactly the review step 4 asks for.

### 2. Code-to-domain map

Each domain entry in `knowledge/index.yaml` may declare `code_paths`: repository path prefixes of the implementation the domain governs. V1 uses plain directory prefixes, not glob patterns; prefixes cover the real cases and keep matching trivial for every consumer (validator, context command, CI gate). This answers the open question of a code-to-knowledge map without adding a new file, and it is the prerequisite for checks 3 and 4.

### 3. Retrieval bundle command

`knowledge:context <file-or-domain>` resolves the governing domain via `code_paths` and prints the retrieval bundle: current spec, active decisions, and domain anchors. Agents use it instead of navigating by inference; its output is the context receipt of KDE-RFC-001 Gate 5, generated rather than self-reported.

### 4. PR drift gate

CI resolves the domains of code files touched by a PR via `code_paths`. If a touched domain has a current spec, the PR must either touch that spec or carry an explicit `no-behavior-change` declaration in its description. Crude by design: it does not prove semantic alignment, it forces the author to assert it consciously and auditable.

## Alternatives

- Semantic drift detection with embeddings or an LLM judge: higher power, but nondeterministic in CI and unnecessary until the crude checks prove insufficient.
- Manual review discipline: the status quo this RFC exists to replace.
- A separate `code-map.yaml`: rejected; one catalog is easier to keep honest than two.

## Open Questions

Resolved at review (2026-09-03):

- Staleness findings are warnings; CI fails only on graph integrity errors. Revisit if warnings prove ignorable in practice.
- The `no-behavior-change` declaration lives in the PR body, where reviewers already look.
- Monorepo composition of `code_paths` (one path serving several domains) stays open until dogfooding against a real product surfaces the concrete shape; V1 allows a prefix to map to multiple domains and the drift gate then requires each mapped domain to be satisfied.

## Outcome

Accepted on 2026-09-03. Decision recorded in DR-008. Staleness check, `code_paths`, `knowledge:context`, and the PR drift gate are implemented.
