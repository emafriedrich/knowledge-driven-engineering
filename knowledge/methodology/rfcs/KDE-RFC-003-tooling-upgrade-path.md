---
id: KDE-RFC-003
title: Upgrade path for framework tooling in adopting repositories
status: implemented
created: 2026-09-03
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Three consecutive field reports ran stale tooling because the idempotent installer never updates existing files
scope: [methodology]
tags: [rfc, tooling]
depends_on: [KDE-SPEC-001]
related: [KDE-RFC-002, DR-011, KDE-RFC-010]
---

# RFC: Upgrade Path For Framework Tooling In Adopting Repositories

## Summary

Add `install.sh --upgrade`: refresh framework-owned files in an adopting repository without ever touching adopter-owned content.

## Problem

The installer is idempotent by design — it never overwrites — which protects adopter files but freezes the tooling at whatever version was installed. Both validator field bugs were fixed upstream within hours, yet the reporting repository kept running the broken versions, and its third report was against code already fixed. Today the only upgrade is manually deleting files and re-running the installer.

## Proposal

Classify installed files by owner:

- **Framework-owned** (safe to refresh): `tools/knowledge-check.mts`, `tools/knowledge-context.mts`, `tools/drift-gate.mts`, `tools/knowledge-hook.mts`, `.github/workflows/kde.yml`, and the KDE hook entries inside `.claude/settings.json`.
- **Adopter-owned** (never touched): everything under `knowledge/`, `templates/` (may carry local edits), `AGENTS.md`, `package.json` beyond the KDE script entries.

`install.sh --upgrade` overwrites framework-owned files with the fetched version and reports each replacement. Without the flag, behavior stays exactly as today. A `# kde-version:` marker line in framework-owned files lets the installer and users see which version a repository runs.

## Alternatives

- Distribute tools as an npm package (`kde-check`): the eventual right answer, but it changes the adoption story and offline behavior; the flag is a one-file bridge that preserves curl-pipe adoption.
- Telling adopters to delete and re-run: the status quo; error-prone and undiscoverable.

## Open Questions

Both resolved at review (2026-09-09):

- `templates/` stay adopter-owned; no hash comparison. Templates are the team's authoring conventions, and the framework's contract with adopters is KDE-SPEC-001 plus the validator, not the template text: a spec change that adds a required section reaches adopters as a validator error, and new template files are already added by a plain installer run because they do not exist yet. Refreshing an unmodified template buys nothing the validator does not already provide, and it would make local edits the one thing that silently changes upgrade behavior.
- The installer warns on version skew on every run, not only with `--upgrade`. The point of the flag is that adopters do not have to remember it; a warning on the run they were already going to make is how they learn it exists.

## Outcome

Accepted on 2026-09-09. Decision recorded in DR-011. Implemented the same day: `install.sh --upgrade`, `kde-version` markers stamped from `package.json` (`0.1.0`), the always-on skew warning, `KDE_REF` pinning to tags, a CI guard that rejects changes to framework-owned files without a version bump, an installer test, and the Upgrading section in ADOPTING.md. The first alternative — distributing the tools as an npm package — is carried forward as KDE-RFC-010 so it is decided explicitly rather than left as the "eventual right answer" in prose.
