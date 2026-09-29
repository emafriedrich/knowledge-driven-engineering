---
id: KDE-RFC-013
title: "Brownfield onboarding: backfill knowledge from an existing codebase"
status: accepted
created: 2026-09-29
updated: 2026-09-29
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field use — KDE was adopted mid-project on a live codebase; months of business rules existed only in code, so the author had agents reconstruct them into an ad-hoc report outside the catalog. Within six days that report contradicted an accepted Decision Record and the code, its file:line citations had drifted, and none of the recovered rules had entered knowledge/. The framework has no intake path for knowledge that already exists but was never written down.
scope: [methodology]
tags: [rfc]
depends_on: []
related: [DR-005, DR-007, DR-009, DR-016, KDE-RFC-009]
---

# RFC: Brownfield Onboarding — Backfill Knowledge From An Existing Codebase

## Summary

Give KDE a first-class answer for the moment every real adoption begins with: the knowledge already exists, but only the code knows it. **Backfill** is an interactive flow per domain: an agent audits the code, presents each recovered rule with its evidence, and the human approves or rejects it on the spot. Approved knowledge lands in catalog artifacts — one **baseline Decision Record** per domain, with the behavioral rules as **specs** anchored to it — never in a monolithic report. Backfill recovers *what the system does*, not *why it was built that way*, and the artifact model must respect that difference.

## Problem

ADOPTING.md's onboarding move is "seed current truth with one decision your team already made." That is the greenfield story. Almost nobody installs KDE at `git init`; the default adopter has a living codebase, months or years of decisions fossilized in code, and an author who has already forgotten some of them.

Field evidence from the first real adoption:

- The most valuable knowledge event in the project's history — a full reconstruction of the business rules by eight parallel agents — happened entirely outside the framework: no template, no lifecycle, no governance. The framework had nothing to say about it.
- The output was genuinely good (specific, testable rules with code evidence) and decayed immediately: within six days it contradicted an accepted Decision Record and the code, its `file:line` citations had drifted by ~24 lines, and its "last review" dates were unreliable. The failure was structural, not editorial: a monolithic snapshot has no per-rule lifecycle — no way to supersede rule 14 while rule 15 stands — no scope for retrieval, and no place in the precedence order when it disagrees with a spec.
- The part of the audit that diffed findings against `knowledge/` caught a wrong *accepted* Decision Record and produced two new ones through the normal draft-and-promote flow. The pipeline works — it was just run by hand, and only for the discrepancies.

There is also a trap in the obvious fix. "Turn the audit into Decision Records" produces dozens of DRs whose rationale nobody remembers — why is the price tolerance 2% and not 3%? An agent forced into the DR template will *invent* the why. Backfill recovers behavior, and behavior with lost rationale is a spec's job, not a decision's.

## Proposal

- **An interactive flow, approval at the moment of sight.** `knowledge backfill <domain>` drives the session: the agent audits the domain's code, then presents recovered rules one at a time — the rule, its code evidence, the test that proves it if one exists, and any conflict with existing `knowledge/`. The human approves, rejects, or edits each rule as it is shown. Approval writes the artifact immediately through the existing machinery (`new` + promotion); there is no pile of forty drafts to triage later, and no approval without the document in front of the approver. Machines propose, humans promote (DR-007 unchanged).
- **One baseline Decision Record per domain.** The first approval in a domain creates its anchor: a DR stating honestly that *these rules describe the system's observed behavior at the time KDE was adopted; they are adopted as current truth; historical rationale was not recovered.* One record, no fabricated reasons. It satisfies the validator's rule that behavior documents entering current truth anchor to an active decision, for every spec the backfill produces in that domain.
- **Recovered behavior becomes specs, not Decision Records.** Approved behavioral rules — state transitions, validation limits, error contracts, invariants — are written as **one spec per feature** (login, registration, product management), grouping the rules that change together, each spec anchored to the baseline DR. The spec is the right artifact for recovered behavior: it answers "what must implementation satisfy," it is edited rather than superseded when the rule evolves, and it can be born with an `acceptance` block naming the existing test that proves it (KDE-RFC-009), so recovered rules arrive with their proof attached. Individual Decision Records are reserved for the minority of findings where a real decision *was* recovered or must be made now — typically architectural stances: infrastructure, caching strategy, eventing versus direct calls, library selection. Those are DR-only: there is no product behavior for a spec to promise (the `DR -> code` path, DR-016).
- **No monolithic output document.** The audit report is scaffolding: uncataloged, precedence tier 6 (cite, never obey), disposable once mined. The readable per-domain summary the adopter wants already exists and is free: the generated `CONTEXT.md` manifest re-renders after every promotion (KDE-RFC-005). A backfill session *may* leave a session log — what was approved, rejected, and why — but a log is history, not truth: nothing retrieves it to learn how the system behaves.
- **Evidence convention: no line numbers.** Backfilled documents cite code by stable identifiers — module paths, exported symbol names, test names — never `file:line`. The field audit's line citations were stale within days while its symbol-level claims stayed true.
- **Approval must cost more than an enter.** The interactive flow makes bulk approval comfortable, and comfort is how rubber-stamping gets institutionalized (field evidence: 46 of 47 decisions approved by a single human, one of them wrong while accepted). Approving a rule requires a minimal act of engagement — confirming the rule's ID or writing a one-line disposition — calibrated so that approving without reading costs more than reading.

## Alternatives

- **Keep backfill ad hoc.** Status quo. Field evidence: the output rots outside governance, contradicts current truth within days, and an agent has no rule for what wins when the snapshot disagrees with a Decision Record.
- **Write approved rules into a dedicated markdown file (BACKFILL.md) instead of catalog artifacts.** Rejected: it recreates the field failure under a new name. A monolithic file has no per-rule lifecycle or supersession, no scope, and no place in precedence — it becomes a second behavioral source competing with specs, which is the disease the catalog exists to cure. What such a file is actually wanted for — a readable record of what was adopted — is already generated per domain as `CONTEXT.md`.
- **One Decision Record per recovered rule.** Rejected: backfill recovers the what, not the why. Dozens of DRs with reconstructed rationale means dozens of plausible fabrications entering the decision log with an approver's name on them — worse than no rationale at all. The baseline DR states the honest epistemic position once; specs carry the rules.
- **Bulk generation of drafts for later triage.** Rejected in favor of the interactive flow: a pile of forty drafts promoted in a separate session is exactly the workflow where approval detaches from reading. Approval at the moment the rule is displayed is both less friction and more sight.
- **A code-analysis engine inside the tooling.** Rejected: the framework's tools validate and move knowledge; they do not read product semantics out of code. Agents do that better every month, and the framework should not compete with its own consumers (DR-003's principle: own the conventions, keep the machinery small).

## Open Questions

All four resolved at review (2026-09-29):

- **Granularity of backfilled specs: one spec per feature.** Not one spec per rule (file explosion, scattered retrieval) and not one spec per domain (unrelated rules coupled into one lifecycle). The cut is the feature — login, registration, product management — grouping the rules that are read together and change together. This matches how the field audit was actually consumed.
- **Resumability is mandatory.** A domain audit surfaces dozens of rules and the session *will* be interrupted; a flow that forgets progress forces re-review and re-approval, which is where approval detaches from reading. `backfill` must persist each rule's disposition (approved, rejected, pending) as it happens, and a re-run presents only the remainder. The session log carries that state; approved rules need no extra bookkeeping — they are already in the catalog.
- **Confidence levels: approval is the verification.** The flow shows each rule's evidence — or states plainly that it found none — but no confidence taxonomy is persisted into the artifacts. A rule enters current truth verified because a human saw the evidence and approved it; the human is the verifier of record (consistent with DR-007: checks are evidence, promotion is a human's). A rule whose evidence does not convince the reviewer is rejected or edited, not approved with a caveat.
- **Partial adoption is supported, unconditionally.** A team may adopt KDE — and backfill — in a single domain and leave the rest of the codebase unmapped. Requiring whole-codebase coverage would make the entry cost the same disease as the greenfield assumption. The existing machinery already behaves correctly at the boundary: the drift gate only ever fires for domains with cataloged specs and declared `code_paths`, so unmapped code is simply outside the contract, exactly as today.

## Outcome

Accepted and implemented on 2026-09-29. Decision recorded in DR-018. Shipped: the `knowledge backfill <domain>` command (session scaffold, draft baseline Decision Record, resumable session reporting with validation of `backfill.yaml`), the session protocol in KDE-PROMPT-002, the brownfield onboarding section in ADOPTING.md, the Brownfield Backfill section and lifecycle command entry in HANDBOOK.md, the agent rule in AGENTS.md and the installer's block, the README pointer, tests. Released as 0.7.0.
