---
id: KDE-RFC-018
title: "Decisions that span repositories: where a cross-service rule lives"
status: draft
created: 2026-09-30
updated: 2026-09-30
drafted_by: agent
approved_by: []
motivated_by: Maintainer question (2026-09-30) — whether the method fits teams split across services; each repository has its own catalog, so a rule that binds two services (a contract, a shared business rule) has no single home, and DR-014 would treat the other repository as an external signal
scope: [methodology]
tags: [rfc, integration]
depends_on: []
related: [DR-009, DR-010, DR-014, KDE-SPEC-001]
---

# RFC: Decisions that span repositories: where a cross-service rule lives

## Summary

Decide where a decision that binds more than one repository lives, and how the others read it as truth rather than as a signal. Today the method is per-repository: a catalog, its domains and their records live in one repository, and nothing can cite a record in another.

## Problem

Inside one service the method works as designed. Across services it does not have an answer:

- **A shared rule has no home.** "An order is refundable for 30 days" may be enforced by orders, payments and support. Each repository can hold its own Decision Record for it, and then there are three copies that drift from each other, which is the problem the method exists to prevent.
- **Contracts are one-sided.** A Contract (DR-010) lives in the repository that implements it. The consumer's code depends on it, but the consumer's drift gate cannot see it change.
- **The precedence rule demotes it.** DR-014 ranks everything outside the repository as a raw signal: cite, never obey. A decision in a sibling repository is, by that rule, a signal, even when it is the accepted decision of the team that owns it.
- **References don't resolve.** `depends_on` and `related` take ids the validator resolves inside one repository; an id from another repository is an error.

## Proposal

No choice is made here; the options are laid out for review.

- **A. Owner-plus-reference.** The owning repository holds the record. Others cite it with a qualified reference (`orders:DR-023@<commit or tag>`) that the validator accepts without resolving, and the manifest lists as "external truth, pinned at …". DR-014 gains a tier: a pinned reference to another repository's accepted record ranks with local decisions.
- **B. Shared knowledge repository.** Cross-service decisions live in one repository with its own catalog; services add it as a submodule or a pinned checkout under `knowledge/shared/`, and the validator treats it as a read-only domain.
- **C. Copy and verify.** Each repository keeps its own copy, marked as a mirror of the owner's record with its source and hash; a CI job compares the hash to the source and fails when the copy is stale.
- **D. Out of scope.** State in HANDBOOK and README's honest limits that the method governs one repository, and that cross-service rules belong in contracts owned by the provider.

## Alternatives

A monorepo sidesteps the problem; it is not something the method can ask of an adopter.

## Open Questions

- How common is this for the teams the method targets? One service per team with a few shared rules, or many services sharing many rules?
- Which of the options keeps the drift gate meaningful? A and B pin a version, so a consumer can fall behind silently; C fails loudly but needs network access in CI.
- Does a cross-repository reference need the other repository to have adopted the method, or can it point at any document with a stable URL?
- Is D the honest first step, with A or B deferred until an adopter with several services asks for it?

## Outcome

<!-- Fill after review: accepted, rejected, or deferred, with links to resulting decisions/specs. -->
