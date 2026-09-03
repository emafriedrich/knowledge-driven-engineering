---
id: KDE-RFC-005
title: Generated domain context manifests
status: accepted
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field use showed retrieval requires shell access plus remembering a command, and adopter asked for an always-fresh per-domain summary
scope: [methodology]
tags: [rfc, retrieval]
depends_on: [KDE-SPEC-001]
related: [KDE-RFC-002, DR-008]
---

# RFC: Generated Domain Context Manifests

## Summary

Each domain may commit a generated `CONTEXT.md`: a precomputed retrieval bundle — current anchors, active decisions, pending drafts, governed code paths — kept honest by a CI check that fails when the committed file differs from the generator output.

## Problem

Retrieval today requires running `knowledge:context`, which assumes shell access and remembering to run it (a prose rule). Agents without a shell — review bots, web agents, indexers — cannot retrieve at all, and agents with one pay a four-hop navigation (catalog, README, decision index, documents) to orient themselves. The adopter's instinct was a hand-maintained per-context summary; a hand-maintained summary is a second place where truth can lie.

## Proposal

- `knowledge:context --write` renders one `CONTEXT.md` per cataloged domain (at the domain's `path`): description, governed `code_paths`, current-truth table, active-decisions table (IDs, titles, updated dates), and pending drafts marked "NOT current truth, do not obey".
- The manifest is a map, never content: titles and pointers only, no copied rationale (DR-002). Business rules live in specs.
- Deterministic output, no timestamps, so `knowledge:context --check` can byte-compare committed manifests against the generator and fail CI on drift. Editing by hand or letting it fossilize is mechanically impossible.
- The validator exempts `CONTEXT.md` from frontmatter rules, like `README.md`.
- Agents read the manifest first (retrieval order); the receipt of Gate 5 still comes from the command.
- V1 is opt-in per domain: `--check` verifies manifests that exist. Requiring one per domain stays open.

## Alternatives

- Hand-written summaries per module (the original instinct): becomes the month-four fossil, rejected.
- Business rules copied into the manifest: duplication guarantees semantic drift and inflates per-session token cost; rejected.
- Manifest files inside code directories or `.agents/`: fights the validator's catalog scoping and duplicates `code_paths`; rejected.

## Open Questions

- Should `--check` eventually require a manifest for every domain?
- Should the in-session hook also verify manifest freshness, or is CI enough?

## Outcome

Accepted on 2026-09-03. Decision recorded in DR-009. Implemented: `--write` / `--check` modes, validator exemption, CI steps, manifests committed for the methodology and example domains.
