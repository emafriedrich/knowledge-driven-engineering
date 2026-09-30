---
id: DR-019
title: Agents draft a decision when the request is clear, an RFC when it is ambiguous, and a spec when behavior has many rules
status: accepted
created: 2026-09-30
updated: 2026-09-30
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, agents]
depends_on: []
related: [KDE-RFC-014, DR-007, DR-016, DR-017, KDE-PROMPT-001]
supersedes: []
superseded_by: []
---

# DR-019: Agents Draft A Decision When The Request Is Clear, An RFC When It Is Ambiguous, And A Spec When Behavior Has Many Rules

## Context

AGENTS.md said what each artifact is for but not how an agent facing a request picks one, so ambiguous requests were resolved silently in code and the question a human should have answered never surfaced. KDE-RFC-014 proposed an explicit decision rule with a stop condition, matching the promise the README makes to adopters.

## Decision

When asked for a change, an agent reads the domain's knowledge first, then picks one artifact:

1. **Clear request, settled rule: Decision Record.** The agent drafts the record and stops there; a simple decision goes from the record to code (DR-016).
2. **Any ambiguity: RFC, then stop.** If a request admits more than one reasonable reading, or a rule's applicability is uncertain, the agent drafts an RFC listing the open questions and stops. It does not choose an answer on the human's behalf, and it does not implement against an assumption. The accepted RFC becomes one or more Decision Records.
3. **Promoted decision with rich behavior: Spec before code.** If the behavior a promoted decision implies is more than a couple of rules — interactions, invariants, edge cases — the agent drafts a Spec anchored to that decision before implementing. Otherwise it implements against the decision and cites it in code.

The rule lives in the **Choosing the artifact** subsection of AGENTS.md, inside the framework-owned section the installer writes and upgrades (DR-017), and in the coding-agent context template (KDE-PROMPT-001).

## Consequences

- Agents ask more, in the form of RFC drafts rather than chat questions; every question in an RFC is one that would otherwise have been answered silently in code.
- The installer's test asserts the installed section carries the rule verbatim, so an adopter on `--upgrade` receives it.
- The choice itself is not machine-checkable; the existing gates still apply around it (`motivated_by` on agent RFCs, DR-007; `implements-draft` when implementing against a draft spec, DR-015).
- Lifecycle and artifact semantics are unchanged: agents draft everything and promote nothing (DR-007).

## Supersession

None.
