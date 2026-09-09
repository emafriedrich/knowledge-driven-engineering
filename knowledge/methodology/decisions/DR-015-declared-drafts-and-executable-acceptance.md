---
id: DR-015
title: Implementing against a draft is declared, and implemented means the acceptance block passed
status: accepted
created: 2026-09-09
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, verification]
depends_on: []
related: [KDE-RFC-009, DR-007, DR-008, DR-013, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-015: Implementing Against A Draft Is Declared, And Implemented Means The Acceptance Block Passed

## Context

The drift gate (DR-008) asks whether code changed in a domain with a *current* spec without touching its knowledge, so it is silent when the only spec is a draft — the exact window in which an agent builds against a proposal nobody accepted. In the field the agent said so in chat, which is self-reporting. Separately, specs ended in prose acceptance checks that agents re-derived as shell commands by hand, and `implemented` was a status anyone could set without evidence. KDE-RFC-009 proposed a declaration and an executable block.

## Decision

- **Implementing against a draft is allowed and declared.** A pull request whose code changes map to a domain whose specs are all drafts must contain `implements-draft: <SPEC-ID>` or `no-behavior-change`; the drift gate fails otherwise, and fails when the declared id is not a draft spec. The declaration also satisfies the gate in a domain that has a current spec. It is visibility, not permission: the spec still needs a human to promote it. Any branch; the gate runs on pull requests.
- **Local parity.** The write hook prints one line when a file under a domain's `code_paths` is written while that domain's specs are all drafts, naming the declaration. A warning, never a block.
- **A spec may carry an `acceptance` fence**: shell commands, one per line, that prove its Acceptance Checks. They normally invoke the project's own test suite, so they run wherever the tests run. The framework runs them and provisions nothing — no services, no containers, no environment mapping. A check that needs a running system belongs in an integration test the project already runs.
- **`implemented` earns its meaning.** `knowledge promote <SPEC-ID> --to implemented` runs the block first and refuses without one or on failure; CI re-runs the block of every spec a pull request promotes to `implemented`, and fails an implemented spec that has none. Passing checks are evidence; promotion remains human (DR-007).
- **One declaration per implemented draft; the receipt is unchanged.** The receipt already lists a domain's pending drafts (DR-009).

## Consequences

- `tools/drift-gate.mts` gains the draft branch and is now a module with an exported `evaluateDrift` so the gate has tests; `tools/knowledge-hook.mts` gains the warning; `tools/knowledge.mts` gains `accept` and `promote --to implemented`; the CI workflows (this repository's and the installer's) gain the acceptance step.
- The spec template shows the fence; prose acceptance checks remain, the fence is what proves them.
- KDE-SPEC-001, HANDBOOK, both AGENTS sections and ADOPTING describe the declaration and the block.
- Adopting repositories receive the tools through `install.sh --upgrade` (DR-011); the CI step reaches them the same way, since the workflow is framework-owned.

## Supersession

None.
