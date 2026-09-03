---
id: DR-007
title: Gate promotion of agent-authored knowledge
status: accepted
created: 2026-09-03
updated: 2026-09-03
authors: [engineering]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [decision, agents]
depends_on: []
related: [KDE-RFC-001, KDE-SPEC-001]
supersedes: []
superseded_by: []
---

# DR-007: Gate Promotion Of Agent-Authored Knowledge

## Context

Agents produce knowledge as well as consume it, and can draft plausible documents in unbounded volume. KDE-RFC-001 proposed mandatory gates so that agents propose but never promote. The proposal was accepted with its open questions resolved.

## Decision

An agent may propose everything and promote nothing. Concretely:

- Documents declare `drafted_by` (`human` | `agent`, binary; absent means human for pre-gate documents) and agent-drafted documents track `approved_by`.
- An agent-drafted RFC must declare `motivated_by`: the ID or description of the conflict, question, or gap that justifies it.
- An agent-drafted document cannot hold an active status (`accepted`, `current`, `implemented`) with an empty `approved_by`. The strong enforcement layer is repository-level: CODEOWNERS plus branch protection on status-changing diffs.
- Specs entering current truth must depend on at least one active decision. User Flows and Information Architecture entering current truth must depend on at least one active decision or current spec. Vision documents are ungated.
- Agent drafts with no update in 30 days (calibrable) are reported for archiving. The validator only reports; archiving is a status transition and stays human.

## Consequences

- New optional metadata fields: `drafted_by`, `approved_by`, `motivated_by` (KDE-SPEC-001 updated).
- The validator enforces the mechanical gates; AGENTS.md carries the declaration duty for agents.
- Pending: enabling branch protection in repository settings, and a receipt-verification CI step once the receipt format stabilizes.
- Known limitation: an agent that omits `drafted_by: agent` passes as human. Harness-level stamping is the future fix.
