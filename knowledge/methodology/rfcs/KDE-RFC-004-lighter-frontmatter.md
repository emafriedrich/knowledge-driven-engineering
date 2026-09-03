---
id: KDE-RFC-004
title: Lighter frontmatter for small documents
status: draft
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: []
motivated_by: Field review found ten required frontmatter fields too expensive for small decisions; if documenting costs more than deciding, people decide without documenting
scope: [methodology]
tags: [rfc, metadata]
depends_on: [KDE-SPEC-001]
related: [DR-006, DR-007]
---

# RFC: Lighter Frontmatter For Small Documents

## Summary

Reduce the required frontmatter from ten fields to six by giving safe defaults to the rest. A small decision should cost six lines of metadata, not ten.

## Problem

Every document currently must declare `id`, `title`, `status`, `created`, `updated`, `authors`, `scope`, `tags`, `depends_on`, and `related` — even when half of them are empty lists written by hand. The cost lands hardest on exactly the documents the method most wants to exist: small, quick Decision Records. Field feedback: "if documenting costs more than deciding, people decide without documenting, and you are back where you started."

## Proposal

Required always: `id`, `title`, `status`, `created`, `updated`, `scope`.

Defaults for the rest:

- `depends_on`, `related`: absent means empty list. No weakening of gates — Gate 4 already requires depends_on *content* for behavior documents entering current truth, regardless of whether the field is written.
- `authors`: required only for documents in a current-truth status (`accepted`, `current`, `implemented`). A draft may be anonymous; promoted truth may not.
- `tags` (artifact type): when absent, inferred from the artifact folder (`decisions/` → decision, `specs/` → spec, `rfcs/` → rfc, `flows/` → flow, `ia/` → ia, `design-system/` → design-system, `prompts/` → prompt, `tasks/` → task). An explicit type tag always wins; a document outside a recognized folder still requires one.

`drafted_by`, `approved_by`, `motivated_by`, `supersedes`, `superseded_by` stay as DR-007 defined them: optional with gate obligations.

## Alternatives

- Keep all ten required: the status quo the field rejected.
- Make everything optional: destroys retrieval (`scope`) and drift detection (`updated`), the two signals the method cannot live without.
- Shorter template instead of laxer validator: does not help documents written without a template.

## Open Questions

- Does folder-based type inference hold in repositories that organize a domain differently?
- Should the validator warn (not error) when a current-truth document has empty `depends_on` even outside Gate 4's document types?

## Outcome

Pending review.
