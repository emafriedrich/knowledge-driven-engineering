---
id: KDE-RFC-007
title: Model and contract artifacts for state machines, domain models and interfaces
status: accepted
created: 2026-09-08
updated: 2026-09-08
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field use (2026-09-07) — a product brief asked for state diagrams, domain models and API contracts; the artifact set has no home for them, so an order state machine with per-fulfillment transitions was written as spec prose and the resulting HTTP contract lived only in code
scope: [methodology]
tags: [rfc, artifacts]
depends_on: [KDE-SPEC-001]
related: [DR-003, DR-007, KDE-RFC-008]
---

# RFC: Model And Contract Artifacts For State Machines, Domain Models And Interfaces

## Summary

Add two artifact types. A **Model** answers *what states, entities and transitions exist?* and carries a diagram as its primary content. A **Contract** answers *what interface does the implementation expose?* — endpoints, payloads, error codes, events — and is anchored to the spec whose behavior it serves. Both enter current truth under the same anchoring rules as flows and IA.

## Problem

KDE-SPEC-001 defines nine artifacts, each answering one question. Two recurring kinds of engineering knowledge answer questions none of them own:

- A lifecycle state machine (an order moving from pending to delivered, with different legal transitions for pickup and delivery and a reason required on some cancellations) is behavior, so it lands in a spec — as prose bullets. Prose state machines are hard to review for completeness, cannot be rendered, and get re-derived by every implementer. A User Flow is the closest type, but it models a *user's* path, not the system's legal states.
- An API contract (routes, request and response shapes, error-code-to-HTTP mapping, event names) changes more often than the behavior it exposes and is consumed by a different audience (frontend, integrators, agents building clients). Folding it into the spec bloats the spec and couples two change rates; leaving it in code means the frontend agent infers the contract from route handlers, which is the exact inference the method exists to remove.

Because neither has a home, neither can be a retrieval anchor, neither is gated on promotion, and neither shows up in a manifest.

## Proposal

- **Model** (`tags: [model]`, ids `MODEL-NNN`). Required sections: Purpose, Diagram, Rules, Exclusions. The Diagram section must contain a Mermaid block (`stateDiagram-v2`, `classDiagram` or `erDiagram`); the validator checks for its presence, nothing more. Rules attach conditions to transitions or relations in prose next to the diagram (actor, reason, invariants), so the diagram stays readable. Anchoring: entering current truth requires an active decision or a current spec, like flows and IA (DR-007 Gate 4).
- **Contract** (`tags: [contract]`, ids `CONTRACT-NNN`). Required sections: Scope, Interface, Errors, Compatibility. The Interface section is markdown tables or fenced examples; a contract may point to a machine-readable definition it mirrors (OpenAPI, JSON Schema, AsyncAPI) through `implements:`, a repository path. Anchoring: a current contract must depend on a current spec.
- **Contract drift obligation.** The paths in a current contract's `implements:` participate in the PR drift gate (DR-008): when those files change and the contract does not, the pull request must declare `no-behavior-change` or it fails. This makes the contract an obligation on the code it describes rather than a description allowed to lag behind it — the property that makes a contract worth trusting from the client side.
- Precedence: a model or contract sits at the *current spec* tier. When a contract disagrees with its spec, the spec wins and the conflict is reported, not resolved.
- Guidance, not a rule: a spec may embed a small Mermaid diagram inline; extract to a Model when more than one document depends on the same machine, or when transitions carry rules of their own.
- Templates `templates/model.md` and `templates/contract.md`; KDE-SPEC-001 artifact rules, the HANDBOOK table, and `TYPE_TAGS` in the validator gain the two types; manifests list them under current truth when anchored in the catalog.

## Alternatives

- Embed diagrams and contracts inside specs. Works for small cases and remains allowed; fails once the machine or interface is shared, and couples the fast-changing contract to the slow-changing spec.
- Use OpenAPI files as the contract artifact directly. Right for HTTP, silent on events, state and error semantics, and not part of the knowledge graph (no id, scope, anchoring, manifest). Keeping OpenAPI as the machine-readable half and Contract as the graph node gets both.
- Use User Flow for state machines. A flow narrates a user's path; a state machine enumerates every legal system transition. Reviewers need the second to find missing transitions.
- Add one generic "diagram" type. Rejected: the artifact set protects meaning by question, not by media (KDE-SPEC-001).

## Open Questions

- Should a contract's `implements:` path be verified for drift (checksum, like manifests), or is a review obligation through `depends_on` enough for V1?
- Should `MODEL`/`CONTRACT` ids be per-domain prefixed (as some adopters prefix RFCs) — a question shared with KDE-RFC-006's allocator?

## Outcome

Accepted on 2026-09-08. Decision recorded in DR-010. Implemented: `templates/model.md` and `templates/contract.md`, the `model` and `contract` type tags with their anchoring rules in the validator, the `implements:` field with path-existence checks, and the drift-gate branch for paths a current contract implements. Open question on `implements` drift resolved in favour of the PR gate over checksums; per-domain id prefixes remain the adopter's choice (the example uses `FD-MODEL-001`).
