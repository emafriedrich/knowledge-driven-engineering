---
id: KDE-RFC-001
title: Promotion gates for agent-authored knowledge
status: accepted
created: 2026-08-31
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: External repository review (2026-08-31) found agent-produced knowledge has no promotion control
scope: [methodology]
tags: [rfc, agents]
depends_on: [KDE-SPEC-001]
related: [KDE-FLOW-001, KDE-PROMPT-001]
---

# RFC: Promotion gates for agent-authored knowledge

## Summary

Define mandatory gates between lifecycle phases so that agents can propose knowledge but never promote it to current truth. Each significant status transition requires human sign-off, enforced mechanically where possible.

## Problem

The method regulates how agents consume knowledge, but agents also produce it. An agent can generate plausible RFCs, specs, and Decision Records in unbounded volume. Without gates, the knowledge repository fills with documents that are correct in form but never reviewed, and future agents will obey them as truth. Prose rules alone do not prevent this: anything enforceable by machine should not be left as prose.

## Proposal

Design principle: **an agent may propose everything and promote nothing.** Human review is the scarce resource; spend it only where truth is decided, and automate surveillance of everything else.

### Gate 1: Visible authorship

Every agent-drafted document declares `drafted_by: agent` and an `approved_by` list that starts empty. This is cheap and enables every other gate. `approved_by` is **traceability that travels with the file, not enforcement**: nothing stops an agent from writing a name into it, which is why Gate 3 has a repository-level layer.

### Gate 2: Justified birth

An RFC with `drafted_by: agent` must carry `motivated_by`: the ID of the conflict, unanswered question, or missing decision that justifies it. Validator rule: agent RFC without `motivated_by` is an error. This cuts document flooding at the root: every draft is born attached to a traceable problem.

### Gate 3: Promotion to current truth is human-only

Any document with status `accepted` or `current` must have a non-empty `approved_by` including at least one human (validator layer), **and** a diff that changes a status to `accepted`/`current` requires PR approval from the owners of the affected domain via CODEOWNERS and branch protection (repository layer). The repository layer is the strong half: the validator alone cannot distinguish a genuine approval from a fabricated one. Prerequisites: a CODEOWNERS file per domain directory and branch protection on the default branch. Neither exists yet; they are part of this proposal.

### Gate 4: Behavior documents only on top of a live decision

A spec cannot become `current` or `accepted` unless `depends_on` references at least one active decision. User Flows and Information Architecture documents cannot enter current truth unless `depends_on` references at least one active decision **or** current spec: they are also product truth that agents obey (precedence layer 3), and gating only specs would make them the smuggling route for unbacked behavior. The relaxed anchor for flows/IA avoids ceremonial Decision Records for experience documents that hang off a spec. Vision documents stay ungated; they precede decisions. Purely mechanical validator rules. This resolves the open question of whether `depends_on` should be required: yes, for behavior documents entering current truth.

### Gate 5: Context receipt before implementation

Before changing code, an agent produces a receipt: the list of knowledge IDs it retrieved, plus either a no-conflict confirmation or the conflict found. The receipt goes in the PR description or task. To avoid self-reporting, the receipt should be **generated** by tooling (`knowledge:context`, proposed in KDE-RFC-002) rather than written by the agent, and CI verifies the mechanical part: the IDs exist, are current, and cover the domains of the touched files.

### Gate 6: Drafts expire

An agent draft with no human activity after N days is flagged for archiving. The validator only **reports** expired drafts; it never mutates them, because archiving is itself a status transition and machines do not promote or demote knowledge. A scheduled job may open an issue or a PR that a human merges. N defaults to 30 days; any value large enough to survive a normal review cycle works, and teams should calibrate it against their real cadence.

## Alternatives

- Trust prose rules in AGENTS.md: already rejected; models violate soft rules under context pressure.
- Full workflow engine for document approval: too heavy for V1; the gates reuse the existing lifecycle and CI.
- Blocking agent authorship entirely: loses the leverage of agents drafting well-formed knowledge for humans to review.

## Open Questions

Resolved at review (2026-09-03):

- `drafted_by` stays binary (`human` | `agent`); model or session granularity adds upkeep without a consumer.
- Gate 4 extends to User Flows and Information Architecture with the relaxed anchor (active decision or current spec). All existing flow/IA documents already complied.
- Gate 6 N defaults to 30 days, explicitly calibrable.

Known limitation: the validator cannot verify that an agent actually declared `drafted_by: agent`; an undeclared agent draft passes as human. Authorship attribution is a harness concern (a hook can stamp the field); until then the declaration rule lives in AGENTS.md.

## Outcome

Accepted on 2026-09-03. Decision recorded in DR-007. Gates 1, 2, 4, 6 and the validator layer of Gate 3 are implemented in the validator; the repository layer of Gate 3 ships as CODEOWNERS plus branch protection (enabled in repository settings); Gate 5 receipts are generated by `knowledge:context` (KDE-RFC-002).
