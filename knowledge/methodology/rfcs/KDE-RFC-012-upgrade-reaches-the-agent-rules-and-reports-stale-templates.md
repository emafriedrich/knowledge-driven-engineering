---
id: KDE-RFC-012
title: Upgrade reaches the agent rules and reports stale templates
status: accepted
created: 2026-09-21
updated: 2026-09-21
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field review by an agent working in an adopting repository (2026-09-21) — after `install.sh --upgrade` the tools were current but the AGENTS.md section still lacked the rules added since install ("create documents with knowledge new", "never run promote") and `templates/spec.md` lacked the acceptance fence; agents read AGENTS.md, so they kept working with the old method on new tools, and the installer reported nothing
scope: [methodology]
tags: [rfc, tooling]
depends_on: [DR-011]
related: [KDE-RFC-003, KDE-RFC-010, DR-013, DR-015]
---

# RFC: Upgrade Reaches The Agent Rules And Reports Stale Templates

## Summary

`install.sh --upgrade` refreshes the tools and the workflow but not the rules agents read. Treat the `<!-- kde:begin -->` … `<!-- kde:end -->` section of `AGENTS.md` as framework-owned — replaced on `--upgrade`, reported as stale otherwise — while everything outside the markers stays the adopter's. Templates stay adopter-owned and are never overwritten; the installer notes which ones differ from the current release so the adopter knows they may be stale.

## Problem

DR-011 classifies `AGENTS.md` as adopter-owned without qualification, and the installer skips its section whenever the `kde:begin` marker is present. Every release that adds an agent rule (DR-013's lifecycle commands, DR-015's `implements-draft`) therefore reaches an upgraded repository as tooling only. The session-loaded file still describes the previous method, so the agent follows it: it creates documents by hand, or does not know promotion commands are off limits. The version-skew warning covers `tools/` and the workflow and is silent about this.

Templates have a milder form of the same gap. DR-011 keeps them adopter-owned on purpose, and relies on the validator to surface contract changes. That holds — a spec without an acceptance fence is refused by `promote --to implemented` with a clear message — but `knowledge new` keeps producing documents from a template that predates the release, and nothing tells the adopter a newer shape exists.

## Proposal

- **The marked section of `AGENTS.md` is framework-owned.** The section between `<!-- kde:begin -->` and `<!-- kde:end -->`, markers included, joins DR-011's framework-owned list. Everything outside the markers remains adopter-owned and is never read, moved or rewritten.
- **`--upgrade` replaces only that section**, in place, and reports it like any other framework-owned file. A section edited locally is overwritten with the same `WARN` the tools get; team-specific agent rules belong outside the markers.
- **Without `--upgrade`, a section that differs from the fetched release is reported** in the existing version-skew warning, which names the flag. The section carries no version marker of its own: it is compared by content, as the tools already are.
- **An `AGENTS.md` without markers is treated as today**: the section is appended. ADOPTING's manual path is corrected to copy the section with its markers, so a hand-made install is upgradable.
- **Templates remain adopter-owned and are never overwritten**, modified or not (DR-011 unchanged on this point). On every run the installer compares each existing template with the release and prints one `note` line per template that differs, naming the file and the release — for example `note  templates/spec.md differs from kde 0.6.0 (yours; not touched)`. It is a note, separate from the version-skew `WARN`: a team that customised its templates on purpose would otherwise see a permanent warning and learn to ignore the one that matters.

**Where it lands.** `install.sh` and its tests; ADOPTING (owner split, manual step 5); a Decision Record that amends DR-011's owner classification.

## Alternatives

- Keep `AGENTS.md` fully adopter-owned and only report a stale section. Cheaper, but leaves the adopter to merge rule text by hand on every release — the friction DR-011 removed for tools — and the rules are as much a part of the framework's behaviour as the validator is.
- Move the agent rules out of `AGENTS.md` into a framework-owned file that the section merely references. Rejected: `AGENTS.md` is the only document loaded every session; a pointer is one more read an agent may skip.
- Refresh unmodified templates using a stored hash. Rejected before (DR-011) and again here: a mechanism for a problem the validator and a one-line note already cover.
- Wait for KDE-RFC-010 (tools as a package). A package would not deliver `AGENTS.md` text either; this gap is independent of how the tools are distributed.

## Open Questions

- Should the template note print on every run or only with `--upgrade`? Proposed: every run, like the skew warning, since a plain run is how new template files arrive.
- Should the note point at the upstream template (a URL at the installed ref) so the adopter can diff it? Proposed: yes, one URL per note line; it costs nothing and removes a search.

## Outcome

Accepted on 2026-09-21 with both open questions resolved as proposed: the template note prints on every run and carries the upstream URL. Decision recorded in DR-017. Shipped in 0.6.0: `install.sh` compares, reports and on `--upgrade` replaces the marked `AGENTS.md` section, leaves a section with a missing end marker alone, and notes differing templates; ADOPTING's owner split and manual step; tests.
