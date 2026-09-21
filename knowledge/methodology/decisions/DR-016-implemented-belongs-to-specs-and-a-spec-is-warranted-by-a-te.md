---
id: DR-016
title: Implemented belongs to specs and a spec is warranted by a testable contract
status: accepted
created: 2026-09-21
updated: 2026-09-21
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, lifecycle]
depends_on: []
related: [KDE-RFC-011, DR-007, DR-008, DR-013, DR-014, DR-015, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-016: Implemented Belongs To Specs, And A Spec Is Warranted By A Testable Contract

## Context

DR-015 gave `implemented` a mechanical meaning on specs — the acceptance block passed at the promoting commit — and left the same word reachable without evidence on Decision Records, RFCs and tasks. A field review also showed the method did not say when a spec is warranted, and that "promotion is human-only" (DR-007) left room for an agent to write `approved_by` after an approval given in chat. KDE-RFC-011 proposed one responsibility per artifact and one meaning per status.

## Decision

- **RFC proposes. Decision Record decides. Spec promises. Tests prove.** An RFC answers whether to do something and ends `accepted`, `rejected` or `archived`. A Decision Record says what was decided and why, and is `accepted` until it is `superseded`. A spec says how the system must behave. The acceptance block and the project's tests say whether it does.
- **`implemented` is exclusive to specs** and keeps DR-015's meaning. The validator rejects it on any other document and names the replacement; `promote --to implemented` refuses every type but spec; it is no longer an active decision status.
- **A task closes with `done`.** `knowledge done` writes it. `done` is valid only on tasks, requires `authors`, and is not current truth.
- **The path follows the size of the change.** `DR -> code` for a simple decision; `DR -> spec -> code + tests` for complex behavior; `RFC -> DR -> spec -> code + tests` under large uncertainty; `RFC -> rejected` is a complete outcome.
- **A spec is warranted when behavior needs an explicit, independently testable contract** — multiple rules, interactions, invariants, edge cases, or acceptance criteria that should not have to be reconstructed from code and decisions — or when rules are expected to change while the decision stays: a Decision Record is superseded, not edited, so rules a team wants to edit belong in a spec anchored to it.
- **Citing a decision from code does not call for a spec.** Comments such as `// DR-017 rule 3` are desirable traceability. The ratio of decisions to specs is not a health metric and the validator does not warn about a domain with decisions, governed code and no spec.
- **Approval in chat is not promotion.** Agents never write `approved_by` and never promote on a human's behalf; they prepare the document and give the human the command. Without repository protections (CODEOWNERS, branch protection) this guarantee is procedural, not technically enforced. No identity or signature mechanism is added.

## Consequences

- `tools/knowledge-check.mts` gains the two status rules and the `done` status; `tools/knowledge.mts` narrows `promote --to implemented` and `done`. Framework 0.6.0.
- Breaking for repositories holding `implemented` outside specs: the validator error names the file and the replacement status. In this repository KDE-RFC-002, 003, 004, 006 and 009 return to `accepted`; a human makes that change.
- Known limitation: the drift gate (DR-008) and the acceptance block act only where specs exist. On the `DR -> code` path behavior is verified by review and the project's tests, with no mechanical link to knowledge. That is the accepted cost of the short path.
- KDE-SPEC-001, HANDBOOK, README, ADOPTING, both AGENTS sections and the task template describe the rules.

## Supersession

None in full. Narrows DR-013 (`promote --to implemented`, the status `done` writes) and DR-015 (which documents may be `implemented`); where they differ, this record holds.
