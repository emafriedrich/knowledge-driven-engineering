---
id: DR-017
title: The agent rules section is framework-owned and stale templates are reported
status: accepted
created: 2026-09-21
updated: 2026-09-21
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, tooling]
depends_on: []
related: [KDE-RFC-012, DR-011, DR-013, DR-015, KDE-RFC-010]
supersedes: []
superseded_by: []
---

# DR-017: The Agent Rules Section Is Framework-Owned, And Stale Templates Are Reported

## Context

DR-011 classified `AGENTS.md` as adopter-owned without qualification, so `install.sh --upgrade` refreshed the tools and left the rules agents read every session at the version first installed. In the field an upgraded repository ran current tooling under an `AGENTS.md` section that predated `knowledge new` and the ban on `promote`, and the installer reported nothing. Templates showed a milder form of the same gap. KDE-RFC-012 proposed moving the marked section across the ownership line and reporting templates.

## Decision

- **The `<!-- kde:begin -->` … `<!-- kde:end -->` section of `AGENTS.md` is framework-owned**, markers included. Everything outside the markers is adopter-owned and is never rewritten.
- **`install.sh --upgrade` replaces only that section**, in place, and reports it. Rules of a team's own belong outside the markers; edits inside them are overwritten.
- **Without `--upgrade` a section that differs from the release is listed in the version-skew warning**, which names the flag. The section is compared by content and carries no version marker.
- **An `AGENTS.md` without markers gets the section appended**, as before. A `kde:begin` without a `kde:end` is reported and left alone.
- **Templates remain adopter-owned and are never overwritten** (DR-011 unchanged). On every run the installer prints one `note` line per existing template that differs from the release, with the URL of the upstream template. It is a note, not a `WARN`: deliberate customisation must not train anyone to ignore the skew warning.

## Consequences

- `install.sh` builds the section once, compares, replaces or reports; its tests cover stale, upgraded and damaged sections and the template note. Framework 0.6.0.
- ADOPTING documents the new owner split, and its manual path copies the section with its markers so a hand-made install is upgradable.
- Independent of KDE-RFC-010: a package would not deliver `AGENTS.md` text either.

## Supersession

None in full. Narrows DR-011's owner classification for `AGENTS.md`; where they differ, this record holds.
