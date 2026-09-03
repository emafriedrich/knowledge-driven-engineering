---
id: KDE-RFC-003
title: Upgrade path for framework tooling in adopting repositories
status: draft
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: []
motivated_by: Three consecutive field reports ran stale tooling because the idempotent installer never updates existing files
scope: [methodology]
tags: [rfc, tooling]
depends_on: [KDE-SPEC-001]
related: [KDE-RFC-002]
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

- Should `templates/` be framework-owned when the adopter has not modified them (hash comparison)?
- Should the installer warn on version skew even without `--upgrade`?

## Outcome

Pending review.
