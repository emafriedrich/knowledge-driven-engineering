---
id: DR-010
title: Models and contracts are first-class artifacts bound to specs and code
status: accepted
created: 2026-09-08
updated: 2026-09-08
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, artifacts]
depends_on: []
related: [KDE-RFC-007, DR-007, DR-008, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-010: Models And Contracts Are First-Class Artifacts Bound To Specs And Code

## Context

Two kinds of engineering knowledge had no artifact: system state machines and domain models (written as spec prose, unreviewable for completeness) and interface contracts (living only in code, so client-side agents inferred them from route handlers). KDE-RFC-007 proposed two artifact types with anchoring and drift obligations.

## Decision

- **Model** (`tags: [model]`) answers *what states, entities and transitions exist?* Its Diagram section must contain a Mermaid block; the validator reports a missing diagram as an error for current-truth models and a warning for drafts. A model enters current truth only when it depends on an active decision or a current spec.
- **Contract** (`tags: [contract]`) answers *what interface does the implementation expose?* A contract enters current truth only when it depends on a current spec. A contract may declare `implements:` — repository paths of the machine-readable definition or the code exposing the interface; every path must exist.
- **Contract drift obligation.** Paths under a current contract's `implements:` participate in the PR drift gate: when they change and the contract does not, the pull request must declare `no-behavior-change`, otherwise it fails. A contract is an obligation on the code it describes, not a description that may lag behind it.
- **Precedence.** Models and contracts sit at the current-spec tier. When a contract or model disagrees with its spec, the spec wins and the conflict is reported.
- Inline Mermaid diagrams inside specs remain allowed; extraction to a model is guidance, applied when more than one document depends on the same machine or when transitions carry rules of their own.

## Consequences

- Two new templates (`templates/model.md`, `templates/contract.md`), two new type tags in the validator, anchoring rules, the `implements` field, and the drift-gate branch.
- Manifests list models and contracts under current truth when a catalog anchors them.
- Frontend and integration agents retrieve the contract from the knowledge graph instead of reading server routes.
- Adopting repositories receive the change through the tooling upgrade path (KDE-RFC-003).

## Supersession

None.
