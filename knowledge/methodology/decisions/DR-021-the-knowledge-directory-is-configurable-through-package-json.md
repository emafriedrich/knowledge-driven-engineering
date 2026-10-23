---
id: DR-021
title: "The knowledge directory is configurable through package.json kde.knowledge; dot-directories are refused"
status: draft
created: 2026-10-23
updated: 2026-10-23
drafted_by: agent
approved_by: []
scope: [methodology]
tags: [decision]
depends_on: [DR-005, DR-011]
related: [DR-017, KDE-RFC-002]
supersedes: []
superseded_by: []
---

# DR-021: The knowledge directory is configurable through package.json kde.knowledge; dot-directories are refused

## Context

DR-005 fixed `knowledge/` as the entry point for canonical knowledge, and every tool, the installer and the agent rules spelled that path out. Teams that adopt the method on an existing repository often already have a place readers look for this kind of document — `docs/`, a `spec/` tree, a monorepo convention — and a second top-level folder competes with it instead of joining it.

The catalog already declares each domain's `path`, so domain trees are relocatable today. The only path the tools assumed was the location of the root catalog itself.

## Decision

The directory that holds the root catalog is configurable per repository with one key in `package.json`:

```json
"kde": { "knowledge": "docs/knowledge" }
```

The default stays `knowledge`. `tools/knowledge-check.mts` exposes `knowledgeDir()`, and the validator, the lifecycle commands, the drift gate, the manifests and the harness hook derive the catalog location from it. The installer accepts `KDE_KNOWLEDGE_DIR` on a fresh install, scaffolds the tree there, writes the agent rules with that path and persists the key; later runs read the key back and never move an installed tree.

The value must be a relative directory inside the repository with no dot-segments. Dot-directories such as `.agents/` or `.claude/` are refused: the validator skips them when it walks the repository, they belong to one tool rather than to the team, and knowledge reviewed in pull requests should stay visible in the tree and on the forge.

## Consequences

Adopters choose where canonical knowledge lives without forking the tools, and the framework keeps a single word for it. No new configuration file: the key sits next to the scripts the installer already writes.

Documentation and examples in this repository keep using `knowledge/`, the default, so prose does not have to hedge on every mention. A repository that renames its directory reads the adopter guide once.

Relocating an installed tree is a manual move plus a key change; the installer refuses a conflicting `KDE_KNOWLEDGE_DIR` on a repository that already has a catalog, so an accidental variable cannot split knowledge across two directories.

## Supersession

None. DR-005 still holds: the directory is organised by domain first, wherever it lives.
