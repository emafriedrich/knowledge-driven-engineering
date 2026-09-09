---
id: DR-013
title: Lifecycle transitions are commands that leave the repository valid or refuse
status: accepted
created: 2026-09-09
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, tooling, lifecycle]
depends_on: []
related: [KDE-RFC-006, DR-007, DR-009, DR-011, DR-012, KDE-FLOW-001]
supersedes: []
superseded_by: []
---

# DR-013: Lifecycle Transitions Are Commands That Leave The Repository Valid Or Refuse

## Context

Promoting a record took four coordinated edits plus a manifest regeneration, and the validator rejected every partial state along the way; creating a domain fought the in-session hook one file at a time. In the field the framework's own author approved a record and asked how to promote it, and an agent scaffolded eight domains through a shell loop to get past the hook. KDE-RFC-006 proposed making each transition of KDE-FLOW-001 one command.

## Decision

- **One entry point, `npm run knowledge -- <command>`**, implemented in `tools/knowledge.mts` on top of the validator and manifest modules: `new`, `promote`, `supersede`, `domain add`, `renumber`. Every command ends by running the validator and refreshing manifests.
- **Transitions roll back.** `promote` and `supersede` apply their edits, run the validator, and undo them if any error remains on a file they touched or appeared anywhere else — then print the validator's reason. A document is never promoted around its own error.
- **The human ceremony of DR-007 is unchanged.** `promote` requires `--by <human>`; agents run `new` (with `--by agent`), `domain add` and `renumber`, never `promote` or `supersede`. The command edits files; authority stays with the reviewed diff.
- **No branch restriction.** The command does not care which branch it runs on; whether a change to `main` needs review is branch protection's decision.
- **Ids are allocated by scanning** every cataloged document plus file names in git history, in the prefix the domain already uses for the type. Collisions the scan misses surface as the validator's duplicate-id error, whose message names `renumber`, which rewrites an id in the document, its file name, every reference, the decision indexes and catalogs at once.
- **Supersession keeps one entry per decision.** A draft replacement is promoted by `supersede --approved-by <human>` under the old record's topic; a replacement that already stands under its own topic retires the old one.
- **Validator hints and placeholders.** Errors that a command fixes name the command (`domain add` for an unknown scope, `promote` for an unapproved agent draft, `renumber` for a duplicate id), and a frontmatter value still wrapped in `<...>` is an error, so a template copied and half-filled cannot pass.
- **Distribution:** `tools/knowledge.mts` is framework-owned under DR-011; the installer adds it and the `knowledge` script to existing repositories.

## Consequences

- Templates remain the source of document shape; `new` reads them, so a template change reaches the command without code changes.
- The installer's AGENTS section, this repository's AGENTS.md, HANDBOOK and ADOPTING describe the commands; the "copy the template" instruction is replaced by `new`.
- KDE-RFC-010 (npm package) would expose these as `kde new`, `kde promote`, and so on; nothing here depends on that decision.
- Adopting repositories receive the command through `install.sh --upgrade`.

## Supersession

None.
