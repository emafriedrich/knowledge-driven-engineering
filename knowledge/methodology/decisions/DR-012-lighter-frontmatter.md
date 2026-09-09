---
id: DR-012
title: Six frontmatter fields are always required; the rest default or are gated
status: accepted
created: 2026-09-09
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, metadata]
depends_on: []
related: [KDE-RFC-004, DR-006, DR-007, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-012: Six Frontmatter Fields Are Always Required; The Rest Default Or Are Gated

## Context

Every knowledge document required ten frontmatter fields, half of them empty lists written by hand. The cost landed on the documents the method most wants to exist — small, quick Decision Records — and field review put it plainly: if documenting costs more than deciding, people decide without documenting. KDE-RFC-004 proposed defaults for the fields that can have them without weakening any gate.

## Decision

- **Always required:** `id`, `title`, `status`, `created`, `updated`, `scope`.
- **`depends_on` and `related`** absent mean empty. Gates that require dependency *content* — a spec, flow, IA, model or contract entering current truth must be anchored — are unchanged.
- **`authors`** is required once a document is in current truth (`accepted`, `current`, `implemented`). A draft may be anonymous; promoted truth may not.
- **The artifact type** is inferred from the folder when no type tag is written: `decisions/`, `specs/`, `rfcs/`, `flows/`, `ia/`, `design-system/`, `models/`, `contracts/`, `prompts/`, `tasks/`, `playbooks/`. An explicit type tag always wins. Outside a recognized folder the tag is required — the rule degrades to the previous behavior, so any organization of the knowledge tree remains valid.
- **Unchanged:** `approved_by`, `motivated_by`, `supersedes`, `superseded_by` stay optional with the gate obligations DR-007 and DR-010 define. `drafted_by` stays the one field an agent must write on every document it drafts: the promotion gate, the `motivated_by` requirement and the manifest's "agent-drafted" marking all key off it, and humans never write it.
- **No new warnings.** The validator does not warn on empty `depends_on` for document types outside the anchoring gate; Decision Records legitimately depend on nothing.

## Consequences

- The validator's required-field list shrinks to six; it gains the current-truth check for `authors` and the folder inference; the error for a missing type names both remedies (write a tag, or move the file).
- KDE-SPEC-001 and the HANDBOOK state the required set and the defaults. Templates keep the full shape: a template is the complete form for someone who wants it, the validator accepts the minimal one for someone who does not.
- A small Decision Record written by a human costs six lines of metadata; the same record drafted by an agent costs seven.
- Adopting repositories receive the change through `install.sh --upgrade` (DR-011).

## Supersession

None.
