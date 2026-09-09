---
id: KDE-RFC-010
title: Distribute framework tooling as an npm package
status: draft
created: 2026-09-09
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: []
motivated_by: KDE-RFC-003 accepted `install.sh --upgrade` as a bridge and named package distribution as the eventual answer; this RFC carries that alternative so it is decided on its own merits rather than left implicit
scope: [methodology]
tags: [rfc, tooling]
depends_on: [KDE-SPEC-001]
related: [KDE-RFC-003, DR-011, KDE-RFC-006]
---

# RFC: Distribute Framework Tooling As An npm Package

## Summary

Publish the validator and companion tools as a versioned npm package with a `kde` binary. Adopting repositories depend on the package instead of carrying copies of `tools/*.mts`; upgrading becomes a dependency bump, and `install.sh` shrinks to scaffolding that the package cannot own (domain directories, `AGENTS.md` section, hook entries).

## Problem

KDE-RFC-003 / DR-011 made copied tooling refreshable with `install.sh --upgrade`, which fixes the immediate failure (three field reports against already-fixed validator bugs). It leaves the underlying shape in place: every adopter holds a private copy of framework code, the framework has no way to know which version a repository runs unless the marker survives local edits, and `--upgrade` is a step someone must remember — the same discoverability problem the flag was meant to end, one level up. Each new tool (`knowledge-context`, `drift-gate`, `knowledge-hook`) adds another file to classify as framework-owned.

## Proposal

- Publish `tools/` as a package exposing one binary, `kde`, with subcommands that map onto today's scripts: `kde check`, `kde context [--write|--check]`, `kde drift`, `kde hook`. If KDE-RFC-006 is accepted, its lifecycle commands (`kde new`, `kde promote`, `kde supersede`) live in the same binary.
- `package.json` scripts in adopting repositories call the binary (`"knowledge:check": "kde check"`); CI and the Claude Code hooks call it the same way, so nothing references a file path inside the repository.
- `install.sh` keeps curl-pipe adoption: it adds the dependency, writes the scaffold that is adopter-owned by definition (domain directories, templates, `AGENTS.md` section, hook entries, CI workflow), and stops copying tools. `--upgrade` becomes unnecessary for tools and is retired; the version marker of DR-011 is replaced by the dependency version.
- Templates ship inside the package and are copied on first install only, preserving DR-011's rule that templates are adopter-owned.
- The knowledge spec version a tool version supports is declared by the package, so skew between an adopter's knowledge tree and its tooling is detectable with a single comparison.

## Alternatives

- Keep copied tools plus `--upgrade` indefinitely (DR-011): works today, but the framework-owned list grows with every tool and adopters still have to know the flag exists.
- Git submodule or subtree for `tools/`: versioned and offline-friendly, but submodules are a known source of friction for teams that do not already use them, and they do not solve invocation paths.
- `npx` straight from the GitHub URL without publishing: no registry account needed, but no semver, no lockfile pinning, and a network fetch on every run.

## Open Questions

- Package name and scope (`kde-tools`, `@kde/cli`, or under the maintainer's scope) — and whether the repository itself becomes the package or a `packages/` split is needed.
- Offline and air-gapped adoption: the tarball path in `install.sh` works without a registry; a package requires one or a vendored tarball.
- Adopters whose primary toolchain is not Node (Python, Go, JVM teams): the `.mts` tools already require Node, so the constraint is not new, but a package makes it a declared dependency rather than a hidden one.
- Hook entries in `.claude/settings.json` currently reference `tools/knowledge-hook.mts`; they would need to resolve the binary through the package manager (`npx kde hook`, `pnpm exec kde hook`) — the installer already detects pnpm/yarn monorepos and can write the right form.
- Release cadence and who cuts releases, given that the methodology repository has no release process today.

## Outcome

Pending review.
