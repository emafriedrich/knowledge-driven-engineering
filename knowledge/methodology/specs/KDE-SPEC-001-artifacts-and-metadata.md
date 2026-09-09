---
id: KDE-SPEC-001
title: Knowledge artifact and metadata rules
status: current
created: 2026-08-30
updated: 2026-09-08
authors: [engineering]
scope: [methodology]
tags: [spec, metadata, artifacts]
depends_on: [DR-002, DR-003, DR-004, DR-005, DR-006, DR-007, DR-008, DR-010]
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
- Model answers: What states, entities and transitions exist? Its Diagram section carries a Mermaid block.
- Contract answers: What interface does the implementation expose? It names the code it obliges through `implements`.
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

Always required (DR-012): `id`, `title`, `status`, `created`, `updated`, `scope`. The rest have defaults or gate obligations: `depends_on` and `related` absent mean empty; `authors` is required once a document is in current truth (`accepted`, `current`, `implemented`); the artifact type in `tags` is inferred from the folder the document sits in (`decisions/`, `specs/`, `rfcs/`, `flows/`, `ia/`, `design-system/`, `models/`, `contracts/`, `prompts/`, `tasks/`, `playbooks/`) when no type tag is written — an explicit tag always wins, and outside those folders the tag is required. Gates that require *content* (a spec's `depends_on` anchor, an agent draft's `approved_by`) are unchanged by the defaults.

Field responsibilities:

- `id` provides a stable reference.
- `title` supports fast scanning and validation.
- `status` shows lifecycle state.
- `created` and `updated` show age.
- `authors` identifies accountable owners. Required in current truth; a draft may be anonymous.
- `scope` identifies the product or system area for retrieval.
- `tags` classify document type or topic inside a scope. The type tag may be inferred from the artifact folder.
- `depends_on` lists canonical documents that should trigger review if they change.
- `related` lists useful context that does not create a review obligation.
- `supersedes` and `superseded_by` apply to Decision Records.
- `drafted_by` declares authorship kind: `human` or `agent`. Absent means human (pre-gate documents).
- `approved_by` lists the humans who approved promotion. Required non-empty for agent-drafted documents in an active status.
- `motivated_by` names the conflict, question, or gap that justifies an agent-drafted RFC (an ID or a short description). Required for agent-drafted RFCs.
- `external_ref` applies to Tasks: the ticket in an external tracker that owns the task's status and assignee (DR-014), as `<system>:<id>` (`jira:PD-123`) or a URL. Shape is validated; reachability is not.
- `implements` applies to Contracts: repository paths (prefixes) of the machine-readable definition or the code that exposes the interface. Every path must exist. These paths participate in the drift gate (DR-010).

Gates on status (DR-007, DR-010): an agent-drafted document cannot hold `accepted`, `current`, or `implemented` with empty `approved_by`. A spec entering current truth must depend on an active decision; a User Flow, Information Architecture or Model document entering current truth must depend on an active decision or current spec; a Contract entering current truth must depend on a current spec. A Model without a Mermaid block is an error in current truth and a warning while drafted.

## Domain Catalog Fields

A domain entry in `knowledge/index.yaml` may declare `code_paths`: plain repository path prefixes of the implementation the domain governs (DR-008). Consumers use prefix matching; V1 has no glob support. `code_paths` feed the `knowledge:context` command and the CI drift gate.

A domain entry may declare `trackers`: a map from tracker system to the key that holds the domain's tasks (`trackers: { jira: PD }`), so an agent can resolve "the tracker for `orders`" from the catalog instead of from a prompt (DR-014).

The drift gate also enforces contract obligations (DR-010): when files under a current Contract's `implements` paths change and the contract file does not, the pull request must declare `no-behavior-change` or the gate fails.

## Validation Scope

The validator checks markdown only inside knowledge trees anchored by a catalog (`knowledge/index.yaml`). Markdown elsewhere in a repository — agent skills, application docs, other tools' frontmatter dialects — is not canonical knowledge and is ignored. A root `knowledge/` directory without a catalog produces a warning, because its documents would otherwise be silently unvalidated.

## Domain Context Manifests

A domain may commit a generated `CONTEXT.md` at its path (DR-009): the precomputed retrieval bundle — description, governed code paths, current anchors, active decisions, pending drafts marked as not truth. Only `knowledge:context --write` renders it; `knowledge:context --check` fails CI when the committed file drifts from the generator output. The manifest carries titles and pointers, never rationale. The validator exempts `CONTEXT.md` from frontmatter rules, like `README.md`.

## Current Truth

Each domain should expose current knowledge through an index. The root `knowledge/index.yaml` catalogs domains. Each domain may keep a local `decisions/index.yaml` for active decisions.

Indexes point to canonical documents. They do not copy rationale.

Only markdown under a catalog is canonical (DR-014). External systems — trackers, wikis, chat — are raw signals below historical knowledge in precedence, or one-way mirrors of accepted knowledge; the one thing a tracker may own is a task's status and assignee.

## Acceptance Checks

- A contributor can start from a domain and find current canonical docs without scanning all artifacts.
- A validator can detect duplicate IDs, invalid statuses, broken dependencies, and stale decision-index targets.
- A validator can detect gate violations on agent-drafted documents and warn when a document is older than a dependency it relies on.
- An agent can obtain the retrieval bundle for a code path from `knowledge:context` without navigating by inference. The bundle also lists the domain's pending drafts, explicitly marked as not current truth, so in-flight analysis is discoverable before promotion.
- A superseded Decision Record remains available as historical evidence.
- A client-side agent can retrieve the interface of a capability from a Contract instead of reading server code, and a change to the code a current Contract implements cannot merge without touching the contract or declaring `no-behavior-change`.
