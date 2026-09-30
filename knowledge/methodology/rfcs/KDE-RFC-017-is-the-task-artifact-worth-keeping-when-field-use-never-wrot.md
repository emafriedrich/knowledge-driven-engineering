---
id: KDE-RFC-017
title: Is the task artifact worth keeping when field use never wrote one
status: draft
created: 2026-09-30
updated: 2026-09-30
drafted_by: agent
approved_by: []
motivated_by: Field use (2026-09-30) — the first production adoption has no task documents in any domain, and neither example ships one; the only task artifact in the repository is the template, while DR-014 already lets a tracker own task status
scope: [methodology]
tags: [rfc, lifecycle]
depends_on: []
related: [DR-013, DR-014, DR-016, KDE-PLAYBOOK-001, KDE-RFC-015]
---

# RFC: Is the task artifact worth keeping when field use never wrote one

## Summary

Decide whether the task artifact stays a first-class type, becomes only a bridge to a tracker, or is repositioned as a plan an agent keeps across sessions. Field use never wrote one, and the method works without them.

## Problem

The artifact set has a task type (`templates/task.md`, `knowledge new task`, `knowledge done`, the `done` status, DR-013, DR-016). In field use no one created a task: the adopter works from Decision Records and specs, and work itself lives elsewhere. Neither example ships one. A type nobody uses still costs: documentation, a template, a status only it may hold, validator rules, and a question every new adopter asks ("do I write tasks too?") that the method answers with "only if you want to".

The case for tasks is real but narrow. A team without a tracker has nowhere else to put work. And a spec large enough to take several sessions needs a plan that survives the end of a session, which is where fast drift happens (KDE-RFC-015). Neither case is served by today's framing, which presents tasks as the default place for implementation work.

## Proposal

No choice is made here; the options are laid out for review.

- **A. Keep as is.** Tasks remain a first-class type. Document plainly that a team with a tracker does not need them.
- **B. Tracker bridge only.** A task document exists to link a ticket (`external_ref`) to the knowledge that justifies it, and nothing else. `knowledge new task` requires `external_ref`. Teams without a tracker put work in the tool they already use.
- **C. Session plan.** Reposition tasks as the plan an agent writes when a spec needs more than one session: bounded steps, each citing the spec rule it serves, closed with `knowledge done`. Retrieval (CONTEXT.md) lists open tasks so the next session resumes from the plan instead of from memory.
- **D. Remove the type.** Keep `external_ref` on Decision Records and specs for linking tickets, drop the template, the command and the `done` status, with a migration note for anyone who wrote tasks.

## Alternatives

Covered by the options above. Waiting for more field evidence is itself an option, and a cheap one: nothing breaks while the question is open.

## Open Questions

- Is one adoption without tasks evidence enough to change the artifact set, or does it only justify changing how tasks are presented?
- If C: does the plan belong in the repository at all, or is it scratch state for the harness that should not be committed?
- If D: DR-014 names tasks as the one thing a tracker may own. What replaces that exception, or does it disappear with the type?
- If B or D: what happens to the `done` status and `knowledge done`, which exist only for tasks?

## Outcome

<!-- Fill after review: accepted, rejected, or deferred, with links to resulting decisions/specs. -->
