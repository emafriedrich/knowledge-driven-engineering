---
id: KDE-SPEC-001
title: Knowledge artifact and metadata rules
status: current
created: 2026-08-30
updated: 2026-09-03
authors: [engineering]
scope: [methodology]
tags: [spec, metadata, artifacts]
depends_on: [DR-002, DR-003, DR-004, DR-005, DR-006, DR-007, DR-008]
related: [KDE-PV-001, KDE-FLOW-001]
---

# Knowledge Artifact And Metadata Rules

## Scope

This spec defines artifact responsibilities, metadata fields, and retrieval rules for Knowledge-Driven Engineering.

## Artifact Rules

- Product Vision answers: What are we building and why?
- RFC answers: What significant change are we proposing?
- Decision Record answers: What important decision did we make?
- Specification answers: What behavior must implementation satisfy?
- User Flow answers: How does a user move through a capability?
- Information Architecture answers: What information exists and where does it live?
- Design System answers: What reusable visual rules exist?
- Task answers: What bounded implementation work remains?
- Prompt / Agent Context answers: What context should an AI agent receive?

Each artifact must answer one primary question. If a document starts carrying proposal debate, final decisions, behavior requirements, and task tracking together, split it.

## Metadata Rules

Use this frontmatter shape for canonical documents:

```yaml
---
id: KDE-SPEC-001
title: Knowledge artifact and metadata rules
status: current
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
scope: [methodology]
tags: [spec]
depends_on: [DR-002]
related: []
---
```

Field responsibilities:

- `id` provides a stable reference.
- `title` supports fast scanning and validation.
- `status` shows lifecycle state.
- `created` and `updated` show age.
- `authors` identifies accountable owners.
- `scope` identifies the product or system area for retrieval.
- `tags` classify document type or topic inside a scope.
- `depends_on` lists canonical documents that should trigger review if they change.
- `related` lists useful context that does not create a review obligation.
- `supersedes` and `superseded_by` apply to Decision Records.
- `drafted_by` declares authorship kind: `human` or `agent`. Absent means human (pre-gate documents).
- `approved_by` lists the humans who approved promotion. Required non-empty for agent-drafted documents in an active status.
- `motivated_by` names the conflict, question, or gap that justifies an agent-drafted RFC (an ID or a short description). Required for agent-drafted RFCs.

Gates on status (DR-007): an agent-drafted document cannot hold `accepted`, `current`, or `implemented` with empty `approved_by`. A spec entering current truth must depend on an active decision; a User Flow or Information Architecture document entering current truth must depend on an active decision or current spec.

## Domain Catalog Fields

A domain entry in `knowledge/index.yaml` may declare `code_paths`: plain repository path prefixes of the implementation the domain governs (DR-008). Consumers use prefix matching; V1 has no glob support. `code_paths` feed the `knowledge:context` command and the CI drift gate.

## Validation Scope

The validator checks markdown only inside knowledge trees anchored by a catalog (`knowledge/index.yaml`). Markdown elsewhere in a repository — agent skills, application docs, other tools' frontmatter dialects — is not canonical knowledge and is ignored. A root `knowledge/` directory without a catalog produces a warning, because its documents would otherwise be silently unvalidated.

## Current Truth

Each domain should expose current knowledge through an index. The root `knowledge/index.yaml` catalogs domains. Each domain may keep a local `decisions/index.yaml` for active decisions.

Indexes point to canonical documents. They do not copy rationale.

## Acceptance Checks

- A contributor can start from a domain and find current canonical docs without scanning all artifacts.
- A validator can detect duplicate IDs, invalid statuses, broken dependencies, and stale decision-index targets.
- A validator can detect gate violations on agent-drafted documents and warn when a document is older than a dependency it relies on.
- An agent can obtain the retrieval bundle for a code path from `knowledge:context` without navigating by inference. The bundle also lists the domain's pending drafts, explicitly marked as not current truth, so in-flight analysis is discoverable before promotion.
- A superseded Decision Record remains available as historical evidence.
