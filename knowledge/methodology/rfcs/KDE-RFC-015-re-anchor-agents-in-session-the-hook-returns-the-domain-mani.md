---
id: KDE-RFC-015
title: "Re-anchor agents in-session: the hook returns the domain manifest on code edits"
status: draft
created: 2026-09-30
updated: 2026-09-30
drafted_by: agent
approved_by: []
motivated_by: DRIFT.md (2026-09-30) names fast drift — an agent that read the rules at the start of a session and implements against a degraded reading or an unsurfaced assumption a hundred thousand tokens later — and admits the method has no mechanical defense against it before the pull request exists; every in-session defense today is procedural
scope: [methodology]
tags: [rfc, agents, tooling]
depends_on: []
related: [DR-008, DR-009, DR-015, DR-019, KDE-RFC-014]
---

# RFC: Re-anchor agents in-session: the hook returns the domain manifest on code edits

## Summary

When an agent edits a file under a domain's `code_paths`, the harness hook that already runs on every edit returns that domain's generated `CONTEXT.md` to the agent, so the rules it must follow re-enter its context at the moment it is changing the code they govern. One mechanical defense against fast drift, built from two pieces that already exist: the manifest (DR-009) and the post-edit hook.

## Problem

The drift gate checks the result at pull-request time and is indifferent to how the divergence happened (DR-008). That is right for the gate and leaves a hole before it: inside a session, an agent reads `CONTEXT.md` once at the start, and by the time it edits checkout its context is saturated with build output, test logs and its own reasoning. What it implements answers a degraded reading of the rules, or an assumption it made along the way. Nothing in the repository changed; the agent stopped following it. DRIFT.md calls this fast drift and says plainly that the defenses against it are procedural: the context receipt, re-reading the manifest, drafting an RFC instead of assuming (DR-019).

Procedural defenses are the ones models drop first under context pressure. Anything enforceable by machine should not be left as prose (KDE-RFC-001's principle).

The hook already looks at code edits: `tools/knowledge-hook.mts` resolves the edited file to a domain through `code_paths` and warns when that domain's only specs are drafts (DR-015). The lookup exists; it just says nothing when the domain has current truth.

## Proposal

- **On an edit under a domain's `code_paths`, the hook returns the domain's `CONTEXT.md`** to the agent as context, not as an error. The manifest is the right payload: it is the retrieval bundle by construction, a map and never rationale, deterministic, and already committed (DR-009). Nothing new is rendered.
- **Once per domain per session, then on a cadence.** The first edit in a domain re-anchors unconditionally. Later edits in the same domain re-anchor again after N further edits in that domain (N calibrable, default in the open questions), because saturation is the problem and one injection at the first edit does not survive it. Session state is a small file keyed by the harness's session id, outside the repository.
- **Cheap on the happy path.** The hook reads the root catalog directly, as it does today, and touches the validator only when it has to. A file outside every `code_paths` costs one catalog read and nothing else.
- **Harness-specific wiring, harness-agnostic principle.** This repository ships the Claude Code wiring in `.claude/settings.json`; the mechanism is "a post-edit hook can return text the agent sees", which other harnesses provide too. Where a harness can only return errors, the manifest goes on the error channel with a clear prefix, as the draft-spec warning does today.
- **No new obligation on the agent.** The receipt, the manifest re-read and the RFC-and-stop rule stay as they are. This adds a mechanical floor under them.

## Alternatives

- **Status quo: procedural only.** Field evidence says agents implement against assumptions within a session; the gate then catches the symptom at PR time, after the work is done and the reasoning is gone.
- **Re-inject on every edit.** Simplest, and it floods the context with the same manifest, which is a different way to saturate it. Cadence is the compromise.
- **Inject before the edit instead of after.** Better in principle: the agent sees the rules before it writes. Whether a pre-edit hook can return context, and not only allow or deny, depends on the harness; left as an open question.
- **A Stop hook that checks the agent read the manifest.** Not verifiable: reading is not observable, and a check the agent can satisfy by echoing a line is theater.
- **Make the drift gate stricter.** Orthogonal. The gate cannot act before the branch exists.

## Open Questions

- **Cadence.** Once per domain per session, then every N edits in that domain. N = 10? The right number depends on how fast a session saturates, which no one has measured; propose 10 and calibrate on the first adoption that runs it.
- **Payload size.** The whole manifest, or only the current-truth and active-decisions tables, without the pending section and the rules footer? The marketplace example's manifest is about thirty lines; a domain with forty decisions is not. Propose the whole manifest up to a line budget, then tables only.
- **Before or after the edit.** If the harness supports returning context from a pre-edit hook, prefer it. Otherwise post-edit, where the agent can still revert.
- **Multi-domain edits.** A file under two domains' `code_paths` (nested prefixes) gets both manifests, or the innermost? Propose the innermost, matching how the drift gate reports.
- **Should the injection count as the receipt?** No: the receipt is what the agent declares it read, in the PR; the injection is what the harness showed it. Keeping them separate keeps Gate 5 honest.

## Outcome

<!-- Fill after review: accepted, rejected, or deferred, with links to resulting decisions/specs. -->
