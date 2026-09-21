---
id: KDE-RFC-011
title: Implemented belongs to specs and a spec is warranted by a testable contract
status: accepted
created: 2026-09-21
updated: 2026-09-21
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field review by an agent working in an adopting repository (2026-09-21) — `implemented` on a Decision Record or RFC requires no evidence, which is what DR-015 criticised in specs and left open elsewhere; the method does not say when a spec is warranted, so the human had to ask the agent; and the agent wrote `approved_by` by hand because the human had approved in chat
scope: [methodology]
tags: [rfc, lifecycle]
depends_on: [KDE-SPEC-001]
related: [DR-007, DR-013, DR-015, KDE-RFC-009, KDE-FLOW-001]
---

# RFC: Implemented Belongs To Specs And A Spec Is Warranted By A Testable Contract

## Summary

Give each artifact one responsibility in the lifecycle and make `implemented` mean one thing. **RFC proposes. DR decides. Spec promises. Tests prove.** `implemented` becomes exclusive to specs, where DR-015 already backs it with a passing acceptance block; Decision Records and RFCs can no longer hold it, and tasks close with `done`. The method also states when a spec is warranted — when behavior needs an explicit, independently testable contract — without making specs mandatory, and closes a wording gap in human-only promotion.

## Problem

DR-015 made `implemented` on a spec mean "the acceptance block passed at the promoting commit". The same status remains reachable with no evidence everywhere else: `promote --to implemented` accepts decisions and RFCs and runs nothing for them, and `knowledge done` sets a task to `implemented`. One word carries four meanings, three of them unverifiable. For a Decision Record the status has no defined meaning at all: a decision is in force or it has been replaced.

The method also does not answer "do I need a spec for this?". HANDBOOK says "create or update a spec when implementation behavior changes", which read literally demands a spec for every change and in practice is ignored: the reporting repository holds 22 accepted decisions and 2 specs. That ratio is not a defect by itself — many decisions are fully expressed by the code that cites them — but the absence of a criterion is, because the human had to ask the agent which path applied.

Finally, "promotion is human-only" (DR-007) is worded around running `promote` and setting a status. An agent that received approval in chat wrote `approved_by: [<human>]` by hand and considered the rule satisfied. The validator only sees a non-empty field.

## Proposal

**Responsibilities.** Each artifact answers one lifecycle question:

| Artifact | Question | Terminal states |
| --- | --- | --- |
| RFC | Should we do this? | `accepted`, `rejected`, `archived` |
| Decision Record | What did we decide, and why? | `accepted` until `superseded` |
| Spec | How must the system behave? | `current`, then `implemented` |
| Acceptance block / tests | Does it actually behave that way? | pass or fail |

**`implemented` is exclusive to specs.**

- A Decision Record cannot be `implemented`. It is `accepted` until it is `superseded`.
- An RFC cannot be `implemented`. It records whether a proposal was accepted, rejected or archived; whether the change landed is visible in the spec and the tasks it produced, and in its Outcome section.
- A spec becomes `implemented` only through `promote --to implemented`, which runs its acceptance block (DR-015, unchanged).
- A task closes with a new status, `done`. `knowledge done` writes it. The command already has that name, and the status stops borrowing a word that now implies evidence.
- The validator rejects `implemented` on any document that is not a spec, with a message that names the replacement (`accepted` for decisions and RFCs, `done` for tasks). `promote --to implemented` refuses every type but spec. `implemented` leaves the set of active decision statuses.

**Paths through the method.** All of these are legitimate; the size of the change picks the path, not a rule that every change visits every artifact:

```text
Simple decision:        DR -> code
Complex behavior:       DR -> spec -> code + tests
Large uncertainty:      RFC -> DR -> spec -> code + tests
Rejected proposal:      RFC -> rejected
```

**When a spec is warranted.** Create or update a spec when behavior needs an explicit, independently testable contract — particularly when it involves multiple rules, interactions, invariants, edge cases, or acceptance criteria that should not have to be reconstructed from code and Decision Records. One further signal: behavior expected to evolve while the decision stays the same. A Decision Record is superseded, not edited; when a team finds itself wanting to edit the rules inside an accepted decision, those rules belong in a spec anchored to it.

A spec is not required merely because code cites a decision. Comments such as `// DR-017 rule 3` are desirable: they explain why code exists and let a reader follow the decision. The ratio of decisions to specs in a domain is not a health metric, and the validator gains no warning for a domain that has decisions, governed code and no spec.

**Human-only promotion, stated completely.** Approval in chat is not promotion. Agents must never write `approved_by` or promote an artifact on behalf of a human. They may prepare the artifact and provide the promotion command for the human to execute. HANDBOOK, README and ADOPTING state that without repository protections such as CODEOWNERS and branch protection this guarantee is procedural rather than technically enforced. No identity or signature mechanism is added; pull-request review is that mechanism.

**Where it lands.** The validator and `promote`/`done` in `tools/`; KDE-SPEC-001 (status rules per type); HANDBOOK (artifact responsibilities, statuses, Creation Criteria); AGENTS.md and the installer's AGENTS section (Knowledge Changes, Hard Rules); the task template. A Decision Record amends DR-015 and DR-013.

## Known Limitation

The drift gate (DR-008) and the acceptance block act only on domains that have specs. On the `DR -> code` path, behavior is verified by pull-request review and the project's own tests, with no mechanical link to knowledge. That is the accepted cost of the short path, not an oversight: a team that wants the mechanical link for a piece of behavior writes the spec.

## Migration

Breaking for repositories that hold `implemented` on non-spec documents, so it ships as a minor version (0.6.0) and the validator error names the fix per file. In this repository: KDE-RFC-002, 003, 004, 006 and 009 return to `accepted` (their Outcome sections already say what shipped). Status changes on agent-drafted documents are made by a human.

## Alternatives

- Keep `implemented` on RFCs, defined as "its decision exists and the change landed". Rejected at review: it keeps an evidence-free meaning of the word next to the evidence-backed one, and the information already lives in the Outcome section.
- Require a spec for all observable behavior, or whenever code cites a decision rule. Rejected at review: it duplicates decisions into specs and punishes the traceability comments the method wants.
- Warn when a domain has `code_paths`, active decisions and no spec. Rejected at review: that condition alone is not evidence of a problem.
- Keep `implemented` for tasks as a documented exception. Possible, but it preserves a second meaning for one word; `done` costs one entry in the status list.
- Add a `withdrawn` status for RFCs. Not needed: `rejected` and `archived` cover it.
- Verify approver identity mechanically (signatures, commit author matching). Rejected: DR-007 already places strong enforcement at the repository level, and the framework stays files, a validator and small commands.

## Open Questions

- Should `done` on a task with `external_ref` change anything else? Proposed: no; DR-014 already makes the tracker the owner of that status.
- Should the validator accept `implemented` on tasks for one release as a warning before it becomes an error? Proposed: no; the error message is the migration guide and the framework is pre-1.0.

## Outcome

Accepted on 2026-09-21 with both open questions resolved as proposed: `done` changes nothing else on a task with `external_ref`, and `implemented` outside specs is an error from 0.6.0 with no warning period. Decision recorded in DR-016. Shipped in 0.6.0: the validator's status rules and the `done` status, `promote --to implemented` limited to specs, `knowledge done` writing `done`, KDE-SPEC-001, HANDBOOK, README, ADOPTING, both AGENTS sections, the task template, tests. KDE-RFC-002, 003, 004, 006 and 009 returned to `accepted`, changed by a human.
