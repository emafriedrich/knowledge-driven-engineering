# How it compares

This is not spec-driven development. You don't hand an agent a document to implement; you stop it from inventing rules you already decided.

## ADRs + AGENTS.md

ADRs and an `AGENTS.md` (or Cursor rules) record decisions and instruct agents, but nothing computes which decisions are current, nothing fails a PR when code and decisions diverge, and nothing gates agent-written knowledge behind a human.

## Spec-driven tools

Spec Kit, Kiro specs and BMAD turn a request into a plan and a task list for an agent to implement, and the documents are done when the task is. Here the documents are the rules that outlive the task — decisions with history, precedence between sources, and a backfill path for rules that only exist in code.

## OpenSpec

The closest relative. It also keeps living specs in the repository and keeps proposals apart from current truth. The two solve different halves: OpenSpec guides a change from proposal to archive; Knowledge-Driven Engineering keeps what was written true afterwards. As of October 2026:

| | OpenSpec | Knowledge-Driven Engineering |
|---|---|---|
| Code changes, spec doesn't | Reconciled by hand; nothing detects it ([maintainers' answer](https://github.com/Fission-AI/OpenSpec/discussions/169)) | The drift gate fails the PR |
| Checks | Structural validation; verification is advisory and skippable | Validator and acceptance run in CI; `implemented` means the tests passed |
| Agent-written knowledge | No approval recorded | Refused as current truth without a recorded human approver |
| Per change | Proposal, design, tasks and spec deltas | One document sized to the change; a simple decision goes from the record to code |
| Why a rule exists | In archived proposals | In the decision record, with what superseded what |

What OpenSpec does better: the propose–implement–archive flow is polished, it supports far more tools, and it has a community behind it. If guiding each change is what you are missing, use it. If your problem is that written rules stop being true and nobody notices, that is what this method is for — and you can start with [decision records alone](README.md#minimal-adoption).

## OKF (Google Cloud)

Same raw material, different half of the problem. OKF standardizes how knowledge is written so any tool can read it; the method governs whether you can trust it. [Detailed comparison](HANDBOOK.md#relation-to-okf).
