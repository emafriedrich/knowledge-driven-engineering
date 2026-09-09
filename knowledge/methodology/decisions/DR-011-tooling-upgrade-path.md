---
id: DR-011
title: The installer refreshes framework-owned files on request and reports version skew always
status: accepted
created: 2026-09-09
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, tooling]
depends_on: []
related: [KDE-RFC-003, KDE-RFC-010, DR-008, DR-010]
supersedes: []
superseded_by: []
---

# DR-011: The Installer Refreshes Framework-Owned Files On Request And Reports Version Skew Always

## Context

`install.sh` is idempotent by design and never overwrites, which protects adopter files but freezes tooling at whatever version was installed. Three consecutive field reports ran validator bugs that were already fixed upstream. KDE-RFC-003 proposed an explicit upgrade path that refreshes framework code without touching adopter content; DR-010 already relies on it as the way adopters receive new artifact types.

## Decision

- **Files are classified by owner.** Framework-owned: `tools/knowledge-check.mts`, `tools/knowledge-context.mts`, `tools/drift-gate.mts`, `tools/knowledge-hook.mts`, `.github/workflows/kde.yml`, and the KDE hook entries inside `.claude/settings.json`. Adopter-owned: everything under `knowledge/`, `templates/`, `AGENTS.md`, and `package.json` beyond the KDE script entries. New tools the framework adds join the framework-owned list in the same change that introduces them.
- **`install.sh --upgrade` overwrites framework-owned files** with the fetched version and reports each replacement. Without the flag the installer behaves as today: it adds what is missing and never overwrites.
- **Templates are adopter-owned without exception.** They are copied on first install and never refreshed, modified or not. The framework's contract with an adopting repository is KDE-SPEC-001 and the validator, not the template text; a spec change that adds a required section surfaces as a validator error, and new template files are added by a plain installer run because they do not exist yet.
- **Framework-owned files carry a `kde-version: X.Y.Z` marker** on their first line, as a comment in the file's own syntax (`//` in the tools, `#` in the workflow); hook entries in `.claude/settings.json` are JSON and carry none — they are re-merged idempotently instead. The installer stamps the marker when it copies a file and, on every run, compares each installed file with the fetched version; it warns when any differs, with or without `--upgrade`, and the warning names the flag.
- **The version is `package.json` `version` in this repository**, starting at `0.1.0`. It is bumped in the same change that alters any file the installer copies (`tools/`, `install.sh`, `.claude/settings.json`); CI rejects such a change without a bump, because an unbumped fix is invisible to adopters — exactly the field failure that motivated KDE-RFC-003. `KDE_REF` accepts a tag, so an install can pin a release.
- Distributing the tools as a package instead of copying them is a separate proposal, KDE-RFC-010. Until it is decided, this decision is the upgrade path.

## Consequences

- `install.sh` gains the `--upgrade` flag, the owner classification, the marker stamping and comparison, and the warning; this repository's CI gains the version-bump guard; CONTRIBUTING.md records the bump rule.
- ADOPTING.md documents `--upgrade`, the owner split and the warning.
- Adopters with local edits to a framework-owned file lose them on `--upgrade`; the per-file report is how they notice. Local edits belong in adopter-owned files or in a proposal upstream.
- If KDE-RFC-010 is accepted, the flag and the marker are retired in favour of the dependency version, and this record is superseded.

## Supersession

None.
