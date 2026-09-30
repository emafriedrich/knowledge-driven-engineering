---
id: KDE-RFC-014
title: Agents choose the artifact and never assume an answer
status: accepted
created: 2026-09-30
updated: 2026-09-30
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: The README rewrite (2026-09-30) promises adopters that the agent picks the artifact for them and never answers an open question on their behalf; AGENTS.md described what each artifact is for but gave the agent no rule for choosing one, or for stopping when a request is ambiguous
scope: [methodology]
tags: [rfc, agents]
depends_on: []
related: [DR-007, DR-016, KDE-PROMPT-001, KDE-FLOW-001]
---

# RFC: Agents choose the artifact and never assume an answer

## Summary

Give agents one explicit decision rule for which knowledge artifact to draft when a human asks for a change: a Decision Record when the request is clear and its rule is settled; an RFC listing the open questions when anything is ambiguous, after which the agent stops; a Spec anchored to the promoted decision when the behavior is more than a couple of rules. The rule that matters most is the middle one: an agent never chooses an answer on the human's behalf and never implements against an assumption.

## Problem

The method already says what each artifact is for — "RFC proposes. Decision Record decides. Spec promises. Tests prove." — and the Knowledge Changes section of AGENTS.md lists creation criteria per artifact. What it never says is how an agent facing a concrete request picks one, and what it does when the request does not fit cleanly.

The gap shows in practice as silent assumptions. A request that admits two readings gets implemented under one of them; a rule whose applicability the agent is not sure of gets applied, or skipped, without anyone being asked. The result looks like a finished change and hides the question that a human should have answered. Field evidence from the first production adoption: decisions were drafted well when the request was clear, but ambiguous requests produced code first and knowledge second, and the questions surfaced only in review, if at all.

The new README (section "Three documents, and who writes which") promises adopters the opposite: that the agent picks the right document, asks instead of guessing, and drafts a spec before implementing rich behavior. That promise is not written anywhere agents read.

## Proposal

Add a subsection **Choosing the artifact** to the Knowledge Changes section of AGENTS.md — and to the framework-owned section `install.sh` writes into adopting repositories (DR-017) — with this rule:

1. **Clear request, settled rule: Decision Record.** If the request is unambiguous and the rule it needs is settled, or the request itself is the decision, the agent drafts a Decision Record and stops there. A simple decision goes from the record to code (DR-016).
2. **Any ambiguity: RFC with open questions, then stop.** If a request admits more than one reasonable reading, or a rule's applicability is uncertain, the agent drafts an RFC listing the open questions and stops. It does not choose an answer on the human's behalf, and it does not implement against an assumption. When the human resolves the questions, the RFC becomes one or more Decision Records.
3. **Promoted decision with rich behavior: Spec first.** Once a decision is promoted, if the behavior it implies is more than a couple of rules — interactions, invariants, edge cases — the agent drafts a Spec anchored to that decision (`depends_on`) before implementing. Otherwise it implements against the decision and cites it in code.

The same rule is reflected in the coding-agent context template (KDE-PROMPT-001), so scoped prompts carry it even when AGENTS.md is not loaded.

Nothing here changes the lifecycle: agents still draft everything and promote nothing (DR-007), and the artifact semantics are unchanged (DR-016). The change is a decision procedure over existing artifacts, plus a stop condition.

## Alternatives

- **Leave it to judgment.** Status quo. Models under context pressure resolve ambiguity by picking the reading that lets them finish; the question disappears into the diff.
- **Always draft an RFC.** Rejected: an RFC for every clear request buries the real questions in ceremony, and the human stops reading them.
- **Ask in chat instead of drafting an RFC.** Rejected: a question in chat has no lifecycle, no scope and no place in precedence. The RFC is the question's canonical form, and its acceptance produces the decision.
- **Enforce mechanically.** Not possible for the choice itself — no validator can tell a clear request from an ambiguous one. What can be enforced already is: an agent RFC must carry `motivated_by` (DR-007), and a draft spec implemented against must be declared in the PR (DR-015).

## Open Questions

Resolved at review (2026-09-30):

- The stop condition does not change the backfill session (KDE-PROMPT-002): the human already disposes of each recovered rule on sight. A recovered rule whose reading is unclear is presented as a question, not as a rule.
- "More than a couple of rules" stays a judgment call, as in DR-016. No number: the creation criteria in HANDBOOK.md already list the signals (interactions, invariants, edge cases, acceptance criteria), and a threshold invites gaming.

## Outcome

Accepted on 2026-09-30. Decision recorded in DR-019. Shipped: the "Choosing the artifact" subsection in AGENTS.md and in the framework-owned section `install.sh` writes, the installer test that asserts the section reaches adopters verbatim, and the rule in the coding-agent context template (KDE-PROMPT-001).
