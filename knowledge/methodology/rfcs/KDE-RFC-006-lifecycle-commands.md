---
id: KDE-RFC-006
title: Lifecycle commands for creating, promoting and superseding knowledge
status: accepted
created: 2026-09-08
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field use — the adopter approved a Decision Record and did not know how to promote it in their own framework; an agent had to scaffold eight domains through a shell loop because the write hook validates each file and scopes must exist before any document can name them
scope: [methodology]
tags: [rfc, tooling]
depends_on: [KDE-SPEC-001]
related: [KDE-RFC-003, KDE-RFC-004, DR-007, DR-009, DR-011, DR-013, KDE-FLOW-001]
---

# RFC: Lifecycle Commands For Creating, Promoting And Superseding Knowledge

## Summary

Add a `knowledge` command with four subcommands — `new`, `promote`, `supersede`, `domain add` — so that every lifecycle transition in KDE-FLOW-001 is one command instead of a sequence of hand edits across a document, a decision index, a catalog and a manifest. The human ceremony stays exactly as DR-007 defines it; only the mechanics become executable.

## Problem

Promotion today is four coordinated edits: set `status`, append `approved_by`, bump `updated`, add a topic to `decisions/index.yaml`, then regenerate manifests (DR-009). The validator rejects every partial state, which is correct, but it means a human who has just made a decision meets an error message instead of a confirmation. In the field the framework's own author approved a record and asked how to promote it.

Creation has the mirror problem. A document cannot declare a `scope` before the domain exists in the catalog, the catalog cannot point to a path that does not exist, and the in-session hook validates after every write. An agent creating a new domain therefore either fights the hook one file at a time or bypasses it with shell scaffolding — which is what happened. Both outcomes teach the wrong lesson: that the validator is an obstacle rather than a guarantee.

Id allocation is also manual (`DR-NNN`, `SPEC-NNN`) and collides silently across branches.

## Proposal

One entry point, `npm run knowledge -- <subcommand>`, implemented in `tools/knowledge.mts` on top of the existing validator and context modules. Every subcommand ends by running `knowledge:check` and `knowledge:context --write`, so the repository never leaves a command in an invalid state.

- `new <type> <domain> "<title>" [--by human|agent]` copies the matching template, allocates the next id for the type (scanning all catalogs and, when available, `git log` on the default branch to reduce cross-branch collisions), fills `created`, `updated`, `scope`, `drafted_by`, and for agent-drafted RFCs leaves `motivated_by` as a required placeholder that the validator will reject until written.
- `promote <ID> --by <human> [--topic <name>]` sets the active status for the type (`accepted` for decisions and RFCs, `current` for specs, flows, IA, design-system docs), appends the approver, bumps `updated`, and — for decisions — writes the topic into the domain decision index. It refuses to promote when the anchoring rules of DR-007 would fail, and prints the exact reason. It changes files only; authority remains the reviewed diff (CODEOWNERS and branch protection), so the command adds nothing an agent could abuse beyond what a text editor already allows.
- `supersede <OLD-ID> --by <NEW-ID>` sets `superseded` / `superseded_by` on the old record and `supersedes` on the new one, swaps the decision-index topic, and lists every document whose `depends_on` names the old id so the dependency review of CONTRIBUTING happens on purpose.
- `domain add <name> --description "<text>" [--code-paths a/ b/]` creates the directory, `decisions/index.yaml` with an empty projection, a minimal README, the catalog entry, and the manifest — in one write batch, before the hook runs.

Error messages of the validator gain a hint line pointing at the command that fixes the state (for example: *scope value `orders` is not a domain — run `knowledge domain add orders`*).

## Alternatives

- Keep templates plus manual edits (status quo). Field evidence says even the framework's author gets lost; every adopter will pay this cost on their first promotion.
- An interactive prompt-driven wizard. Heavier, harder to script from agents and CI, and hides which files change; explicit flags keep the diff reviewable.
- Editor snippets or skills that expand frontmatter. They solve creation but not indexes, manifests or supersession, which is where the coordinated edits live.
- Relax the validator to accept partial states during a batch. Rejected: partial states are exactly the drift the validator exists to prevent.

## Open Questions

All three resolved at review (2026-09-09):

- No branch restriction, not even a warning. The command edits files exactly as an editor would; whether a change to `main` needs review is the repository's branch protection to decide, and a command that refuses gets bypassed by hand — the status quo this RFC exists to end.
- A git-aware scan allocates ids; no counter file. Collisions are rare, the validator already reports them at merge, and a `renumber <OLD> <NEW>` subcommand rewrites the id everywhere in one step — so the fix is tooling, not an agent spending tokens on search-and-replace.
- Via the installer: `tools/knowledge.mts` is framework-owned under DR-011, so `install.sh` adds it to existing repositories and `--upgrade` refreshes it; the installer also sets the `knowledge` script in `package.json`.

## Outcome

Accepted and implemented on 2026-09-09. Decision recorded in DR-013. Shipped `tools/knowledge.mts` with `new`, `promote`, `supersede`, `domain add` and `renumber`; validator hints that name the fixing command; a validator error for unfilled template placeholders; installer, AGENTS section, HANDBOOK and ADOPTING updates; tests. Two behaviours settled during implementation: `promote` and `supersede` roll back whenever an error remains on a file they touched (a document cannot be promoted around its own error), and `supersede` promotes a draft replacement with `--approved-by` under the old record's topic, or retires the old topic when the replacement already stands under its own (the DR-001 → DR-004 precedent).
