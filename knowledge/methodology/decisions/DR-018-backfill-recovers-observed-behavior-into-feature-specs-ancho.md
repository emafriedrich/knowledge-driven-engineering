---
id: DR-018
title: Backfill recovers observed behavior into feature specs anchored to a baseline decision
status: accepted
created: 2026-09-29
updated: 2026-09-29
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision]
depends_on: []
related: [KDE-RFC-013, KDE-PROMPT-002, DR-007, DR-016]
supersedes: []
superseded_by: []
---

# DR-018: Backfill Recovers Observed Behavior Into Feature Specs Anchored To A Baseline Decision

## Context

Almost no adopter installs KDE at `git init`; the default adoption is brownfield, with months of decisions fossilized in code. The first field adoption showed what happens without a framework path for that moment: the rule reconstruction happened outside the catalog, its output contradicted an accepted Decision Record within six days, and none of the recovered rules entered `knowledge/`. KDE-RFC-013 proposed the backfill flow and its review resolved the open questions this record fixes.

Backfill recovers *what the system does*, not *why it was built that way*. An agent forced to write a Decision Record per recovered rule would invent the rationale.

## Decision

1. **Backfill is an interactive session, not a bulk import.** `knowledge backfill <domain>` starts or resumes it; the agent audits the code and presents each recovered rule with its evidence, and the human approves, rejects, or edits it on sight. Approval writes catalog artifacts immediately through `new` and `promote`; promotion stays human (DR-007).
2. **One baseline Decision Record per domain** (tagged `backfill`) states honestly that the approved rules describe observed behavior at adoption time and that historical rationale was not recovered. It is the anchor every backfilled spec depends on.
3. **Approved behavior becomes one spec per feature** (login, registration, product management) — grouping the rules that are read and change together — never a Decision Record per rule and never a monolithic report. Architectural stances recovered by the session (infrastructure, caching, eventing, library choices) become their own Decision Records instead of specs (the `DR -> code` path, DR-016).
4. **Evidence is cited by stable identifiers** — module paths, exported symbols, test names — never `file:line`. Where an existing test proves a rule, the spec names it and may wire it into an acceptance block.
5. **Approval is the verification.** No confidence taxonomy is persisted: a rule enters current truth because a human saw the evidence and approved; a rule whose evidence does not convince the reviewer is rejected or edited, never approved with a caveat.
6. **Sessions are resumable.** Dispositions are recorded in `knowledge/<domain>/backfill.yaml` as they are given; a re-run reports only the remainder. The file is session history, never current truth, and is archived or deleted once the domain is mined; the generated `CONTEXT.md` is the readable summary.
7. **Partial adoption is supported unconditionally.** A team may backfill one domain and leave the rest of the codebase unmapped; the drift gate already ignores code outside cataloged `code_paths`.

## Consequences

- `knowledge backfill <domain>` ships with the lifecycle commands (framework-owned, so `install.sh --upgrade` distributes it), scaffolding the session file and the draft baseline record and reporting session state.
- KDE-PROMPT-002 defines the session protocol an agent follows; ADOPTING.md gains the brownfield onboarding section and HANDBOOK.md the backfill rules.
- The volume of a backfill session concentrates approvals on one human; the flow shows each rule before its disposition is recorded, but repository protections (CODEOWNERS, branch protection) remain the technical guarantee, as everywhere else in the method.

## Supersession

<!-- If this replaces another decision, link it here and update the old record. -->
