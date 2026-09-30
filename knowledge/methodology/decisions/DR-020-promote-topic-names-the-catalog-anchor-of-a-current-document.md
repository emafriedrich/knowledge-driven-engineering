---
id: DR-020
title: "promote --topic names the catalog anchor of a current document; the validator warns on an unanchored current spec"
status: draft
created: 2026-09-30
updated: 2026-09-30
drafted_by: agent
approved_by: []
scope: [methodology]
tags: [decision]
depends_on: []
related: [DR-007, DR-009, DR-013, DR-019, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-020: promote --topic names the catalog anchor of a current document; the validator warns on an unanchored current spec

## Context

A domain's `CONTEXT.md` lists its current truth from the `current:` map of the domain entry in `knowledge/index.yaml` (DR-009, KDE-SPEC-001). Promoting a spec, flow, model or any other document to `current` only changed the document's own `status`, so nothing put it in that map. The marketplace example shipped two `status: current` specs while its manifest read "Current truth: None yet", and an adopter promoting a spec today hits the same gap: the document says it is current, the manifest an agent reads does not. Deriving the anchors from status instead was rejected in DR-009, because a domain can hold two current specs for one role and the catalog is where a human says which one stands.

Decision indexes already solve the same problem for Decision Records: `promote --topic <name>` writes the topic in the same operation as the status change.

## Decision

1. **`promote <ID> --by <human> --topic <name>` declares the document.** For every type whose promoted status is `current` (spec, flow, ia, design-system, model, contract, playbook, prompt), `--topic` writes `<name>: <ID>` under `current:` in the domain's entry of its catalog, in the same operation that sets the status, and the domain manifest is regenerated. The name is the place the document occupies in the domain, in one or two words (`availability`, `product_vision`). It is the same concept as a decision topic and uses the same flag.
2. **A name held by a different document is refused.** The error names the current holder. Replacing an anchor is done by hand until supersession covers documents other than Decision Records.
3. **Without `--topic`, promotion still succeeds** and says the document is not declared in the catalog, so `CONTEXT.md` will not list it. Some current documents are deliberately not anchors.
4. **Re-running with `--topic` on a document that is already current anchors it** without touching the document, the way a promoted Decision Record missing from its index is indexed. This is how an existing project repairs a spec it promoted earlier.
5. **`--topic` on a type without a current status is refused** (RFC, task), instead of being silently ignored as before.
6. **The validator warns, never fails,** when a `current` spec is not listed under `current:` of its domain. Only specs are checked: the precedence rule names the current spec, and warning on every playbook or flow would bury the signal.

Anchoring changes what agents treat as truth, so it stays a human act under `--by` (DR-007).

## Consequences

- Promoting a spec with `--topic` leaves the catalog, the document and the manifest consistent in one command, and `knowledge:context --check` passes.
- A project upgrading the tools may see new warnings for current specs it never anchored; `promote <ID> --by <human> --topic <name>` clears each one.
- Affected artifacts: `tools/knowledge.mts`, `tools/knowledge-check.mts`, KDE-SPEC-001 (Domain Catalog Fields), HANDBOOK.
- Not covered: supersession between documents other than Decision Records, and shorter default topics for Decision Records. Both stay separate questions.

## Supersession

None.
