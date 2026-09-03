---
id: DR-009
title: Domains expose a generated CONTEXT.md manifest
status: accepted
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, retrieval]
depends_on: []
related: [KDE-RFC-005, DR-002, DR-008]
supersedes: []
superseded_by: []
---

# DR-009: Domains Expose A Generated CONTEXT.md Manifest

## Context

Retrieval depended on running a command (shell + discipline required), leaving shell-less agents blind and making orientation cost four navigation hops. KDE-RFC-005 proposed a committed, generated per-domain manifest and was accepted.

## Decision

- A domain may commit `CONTEXT.md` at its path, rendered only by `knowledge:context --write`.
- Content is a map, never rationale: current anchors, active decisions, pending drafts (marked not truth), governed code paths — titles and pointers only.
- Output is deterministic; `knowledge:context --check` byte-compares committed manifests in CI and fails on drift. Freshness by construction, not by discipline.
- The validator exempts `CONTEXT.md` from frontmatter requirements, like `README.md`.
- Agents read `CONTEXT.md` first when present; changing knowledge artifacts obliges regenerating manifests.

## Consequences

- Promotion of a decision becomes visible as a manifest diff in the PR.
- Shell-less agents, humans browsing, and indexers get the retrieval bundle for free.
- A knowledge change now has a second mechanical step (`--write`); CI rejects forgetting it.
- V1 is opt-in per domain; requiring manifests everywhere stays an open question in KDE-RFC-005.
