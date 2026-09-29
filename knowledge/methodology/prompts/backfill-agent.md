---
id: KDE-PROMPT-002
title: Backfill session protocol
status: current
created: 2026-09-29
updated: 2026-09-29
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [prompt, agents, backfill]
depends_on: []
related: [KDE-RFC-013, KDE-PROMPT-001]
---

# Backfill Session Protocol

Give an agent this protocol when a domain's behavior already exists in code but not in `knowledge/` (KDE-RFC-013). The agent audits and proposes; the human approves each rule on sight; every promotion stays a human's (DR-007).

```text
Domain:
<domain name from knowledge/index.yaml>

Session:
Run `npm run knowledge -- backfill <domain>` first. A first run scaffolds
knowledge/<domain>/backfill.yaml and a draft baseline Decision Record; a
re-run reports what is already approved, rejected, and pending, so present
only the remainder.

Audit:
- Read the domain's code and tests; enumerate its behavior rules grouped by
  feature (login, registration, product management).
- Cite evidence by stable identifiers: module paths, exported symbols, test
  names. Never file:line — line numbers rot.
- Diff every rule against existing knowledge/. Report conflicts with active
  decisions or current specs; never resolve them silently.

Present rules one at a time:
- The rule, its evidence, the test that proves it if one exists, and any
  conflict found. State plainly when you found no evidence.
- Record the human's disposition in backfill.yaml as it is given
  (pending | approved | rejected), with the spec id once the rule lands.

On approval:
- Behavior rules go to one spec per feature (`new spec <domain> "<feature>"
  --by agent`), each spec depends_on the baseline Decision Record. Name the
  proving test in Acceptance Checks; wire an acceptance block when the test
  is runnable.
- Architectural stances (infrastructure, caching, eventing, library choices)
  get their own Decision Record instead of a spec.
- Hand the human the exact promote command; running it is the approval. With
  the first approval, the baseline Decision Record is promoted first.

Rules:
- Approval is the verification: a rule whose evidence does not convince the
  reviewer is rejected or edited, never approved with a caveat.
- Do not invent rationale for recovered behavior; the baseline record states
  that the why was not recovered.
- Do not write recovered rules into any standalone report or summary file;
  the generated CONTEXT.md is the readable summary, and backfill.yaml is
  session history, never current truth.
```
