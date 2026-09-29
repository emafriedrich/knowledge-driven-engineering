# Backfill Protocol

Follow this when a human asks you to backfill a domain, or when a domain's behavior exists in code but not in `knowledge/`. Backfill recovers what the system *does* into catalog artifacts the human approves rule by rule. You audit and propose; the human decides; promotion is always the human's.

## 1. Open the session

Run `npm run knowledge -- backfill <domain>`.

- A first run creates `knowledge/<domain>/backfill.yaml` (session state) and a draft **baseline Decision Record** tagged `backfill`, stating that recovered rules describe observed behavior at adoption time and that historical rationale was not recovered.
- A re-run reports what is already approved, rejected, and pending. Resume from there: never present a rule that already has a disposition.

## 2. Audit

- Read the domain's code (its `code_paths` in `knowledge/index.yaml`) and its tests. Read the domain's existing knowledge first: its CONTEXT.md, active decisions, and specs.
- Enumerate behavior rules grouped by **feature** (login, registration, product management). A rule is observable and testable: a state transition, a validation limit, an error contract, an invariant, a permission.
- Cite evidence by stable identifiers — module paths, exported symbols, test names. **Never `file:line`**; line numbers rot within days.
- Diff every rule against existing knowledge. A rule an active decision or current spec already states is not backfilled again. A rule that **contradicts** existing knowledge is reported as a conflict for the human to resolve — never resolved silently, never written as a spec.
- Uncataloged documents (audit reports, wikis, tickets) are raw material: cite them, check them against the code, never copy them as truth.
- Record every recovered rule in `backfill.yaml` with `disposition: pending` before presenting any, so an interrupted session loses nothing.

## 3. Present rules one at a time

For each pending rule show: the feature, the rule in one or two sentences, its evidence, the test that proves it (or "no test found"), and any conflict. When you found no evidence, say so plainly.

Then wait. The human approves, rejects, or edits. Record the disposition in `backfill.yaml` as it is given, with a one-line `note` when the human gives a reason. Do not batch several rules into one question.

## 4. Write what was approved

- **Behavior rules** go to **one spec per feature**: `npm run knowledge -- new spec <domain> "<feature>" --by agent`, then add the baseline Decision Record to its `depends_on`. Later approvals for the same feature extend the same spec. Name the proving test in Acceptance Checks; wire an `acceptance` block when the test is runnable. Record the spec id on each rule in `backfill.yaml`.
- **Architectural stances** — infrastructure, caching, eventing versus direct calls, library choices — get their own Decision Record (`new decision ... --by agent`) instead of a spec. Only when the human can state the why; otherwise the stance stays under the baseline.
- Never invent rationale. Never write recovered rules into a standalone report or summary file; the generated CONTEXT.md is the readable summary.

## 5. Hand over promotion

You never promote. When a feature's spec is complete, give the human the exact commands, baseline first if it is still a draft:

```text
npm run knowledge -- promote <BASELINE-ID> --by <human>
npm run knowledge -- promote <SPEC-ID> --by <human>
```

Running them is the approval. When no rules remain pending, tell the human the domain is mined and that `backfill.yaml` can be archived or deleted.
