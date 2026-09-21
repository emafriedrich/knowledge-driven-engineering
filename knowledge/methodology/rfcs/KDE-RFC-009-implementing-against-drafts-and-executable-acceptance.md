---
id: KDE-RFC-009
title: Declared implementation against drafts and executable acceptance checks
status: accepted
created: 2026-09-08
updated: 2026-09-09
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
motivated_by: Field use — an agent implemented the screen half of a spec that was still a draft and disclosed it only in chat; the drift gate fires only for domains that have a current spec, so pre-approval work was invisible to it, and the spec's acceptance checks had to be re-derived by hand as shell commands
scope: [methodology]
tags: [rfc, verification]
depends_on: [KDE-SPEC-001]
related: [DR-007, DR-008, DR-009, DR-013, DR-015, KDE-RFC-006, KDE-FLOW-001]
---

# RFC: Declared Implementation Against Drafts And Executable Acceptance Checks

## Summary

Two additions at the spec-to-implementation boundary. First, implementing against a draft must be **declared** (`implements-draft: <ID>`) so the drift gate and reviewers see it, instead of forbidding a practice that is normal in parallel work. Second, a spec may carry **executable acceptance checks**, and the `implemented` status — which exists today without a mechanical meaning — becomes reachable only when they pass.

## Problem

DR-008's drift gate asks: does this change touch a domain with a *current* spec without touching its knowledge? When the only spec is a draft, the gate is silent by construction. That is the exact window where an agent, asked to "make it prettier", builds against a proposal a human has not accepted. In the field the agent did the right thing — it reported "SPEC-002 is still draft" — but a prose rule enforced by the agent's own honesty is what DR-007 Gate 5 calls self-reporting.

Separately, specs end in an Acceptance Checks section written for a human. An agent reads "invalid transition returns 409" and writes a curl command; a reviewer reads it and trusts the agent. Nothing links the check in the spec to the command that proves it, and `implemented` is a status any human can set without evidence.

## Proposal

- **Declaration.** A pull request (or task) whose changes map to a domain where the governing spec is a draft must contain `implements-draft: <SPEC-ID>` in its body, or `no-behavior-change` as today. The drift gate gains this branch: draft spec plus code changes plus no declaration fails. The declaration is not permission — the spec still needs promotion — it is visibility: the manifest lists the draft as pending, the PR names it, and promoting the draft later closes the loop.
- **Local parity.** The write hook that validates knowledge also knows `code_paths`. When a file under a domain's code paths is written and that domain has drafts but no current spec, the hook prints one line: *implementing against draft SPEC-002 — declare `implements-draft` in the PR*. A warning, never a block; work continues.
- **Executable acceptance.** A spec may include a fenced block tagged `acceptance` containing shell commands, one per line, optionally preceded by `requires: <service>` lines naming what must be running. `knowledge:accept <SPEC-ID>` runs the block and reports pass or fail per command. Prose acceptance checks remain allowed; the block is additive and typically shorter.
- **`implemented` earns its meaning.** A spec cannot move to `implemented` unless `knowledge:accept` passed at the commit that sets the status; the validator records nothing new, but the promote command (KDE-RFC-006) refuses without a passing run and CI re-runs the block for specs whose status changed to `implemented` in the diff. Promotion remains human (DR-007); the check only gates it.

## Alternatives

- Forbid implementing against drafts. Rejected: review latency would block all parallel work, and teams would route around it by not writing drafts.
- Rely on PR review to notice draft-based work. The drift gate exists because prose rules fail under load; this is the same failure with a different name.
- Keep acceptance purely in the test suite. Tests prove code; the link from a spec's requirement to the test that covers it is what reviewers and agents lack. The block is that link, not a replacement for tests.
- Auto-set `implemented` when acceptance passes. Rejected: machines do not promote (DR-007); passing checks are evidence, not authority.

## Open Questions

All three resolved at review (2026-09-09):

- The framework provisions nothing. An acceptance block normally invokes the project's own test suite, which already runs wherever the project's CI runs, with whatever services the project's CI provides. A check that needs a running API belongs in an integration test the project already knows how to run; `requires:` lines, docker mappings and a `manual` category are dropped. A command that only passes on one machine fails in CI, exactly like a test would.
- `implements-draft` is allowed on any branch. Branch policy is not the framework's (DR-013); the gate runs on pull requests, where the declaration lives, and the local hook warns on every branch.
- One declaration per implemented draft in the PR body; the receipt is not extended. The declaration states intent; the receipt already lists the domain's pending drafts automatically (DR-009), which is what was seen — asking the agent to enumerate what it consulted would reintroduce the self-reporting Gate 5 exists to remove.

## Outcome

Accepted and implemented on 2026-09-09. Decision recorded in DR-015. Shipped: the drift gate's draft branch and `implements-draft` validation, the write hook's one-line warning, the `acceptance` fence in the spec template, `knowledge accept <ID>` and `accept --promoted <ref>`, `promote --to implemented` gated on a passing run, the CI step in this repository and in the installer's workflow, KDE-SPEC-001, HANDBOOK, AGENTS sections and ADOPTING, tests.
