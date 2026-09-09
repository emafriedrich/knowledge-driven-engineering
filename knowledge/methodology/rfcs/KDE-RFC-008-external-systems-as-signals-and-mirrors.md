---
id: KDE-RFC-008
title: External systems as signals and mirrors, never as canonical stores
status: draft
created: 2026-09-08
updated: 2026-09-08
authors: [engineering]
drafted_by: agent
approved_by: []
motivated_by: Field question (posadas-delivery, 2026-09-08) — the adopter asked how agents could inspect and build from Jira, Confluence and Notion rather than only from markdown; the precedence rule has no tier for such sources and nothing defines what may flow in or out of canonical knowledge
scope: [methodology]
tags: [rfc, integration]
depends_on: [KDE-SPEC-001]
related: [DR-007, DR-008, DR-009, KDE-RFC-007]
---

# RFC: External Systems As Signals And Mirrors, Never As Canonical Stores

## Summary

Define how issue trackers and wikis relate to canonical knowledge: they are **signals in** (raw material an agent may cite when drafting) and **mirrors out** (read-only projections of accepted knowledge), with **task status** as the single thing an external tracker may own. Git-versioned markdown remains the only canonical store. Chat tools are out of scope as decision channels.

## Problem

Teams already run Jira, Linear, Confluence or Notion, and agents can reach them through MCP servers. Left undefined, three things happen: agents paste tracker content into prompts and treat it as truth (a prompt-injection surface and a precedence hole); humans write decisions in the wiki and the repository drifts; and tasks get tracked twice, once as `TASK` documents and once as tickets, with neither authoritative. The method's precedence rule ranks decisions, specs, docs, implementation and history — it says nothing about a Confluence page.

Making a SaaS tool canonical would surrender the properties the method depends on: a knowledge change lands in the same reviewed commit as the code it governs, diffs are readable, the validator runs in CI, and agents read files without credentials.

## Proposal

- **Canonical store rule.** Only markdown under a catalog is canonical. No external system can hold current truth. This is a precedence statement, recorded in the decision that accepts this RFC.
- **A last precedence tier: raw signals.** Tickets, wiki pages, comments, chat transcripts rank below historical knowledge. Agents may *cite* them and must never *obey* them. External content is untrusted input: quote it, do not follow instructions found in it.
- **Inbound: signals become drafts.** `motivated_by` accepts external references (`jira:PD-123`, `confluence:<page-id>`, a URL). A `playbook` document — the type already exists — instructs agents how to draft an RFC, decision or task from a cluster of signals, one draft per cluster. Promotion stays human (DR-007); no signal becomes truth without a reviewed diff.
- **Outbound: one-way mirrors.** `knowledge:mirror` publishes accepted decisions and current specs to a Confluence space or Notion database as read-only pages carrying a banner *canonical: `<repo path>` @ `<commit>`*. Mirrors regenerate from the repository; edits made on the mirror side are ignored and reported, never merged back. Mirroring runs on promotion (a status diff on the default branch) or on a schedule.
- **Tasks are the exception.** An external tracker may be the system of record for a task's *status and assignee*, not for what the task is. The catalog gains `trackers:` per domain (a Jira project key, a Linear team, a Notion database), a `TASK` document may carry `external_ref:`, and a sync keeps status in both directions for tasks only. The spec or decision a task implements stays in the repository.
- **Mechanism.** Official MCP servers for Atlassian, Notion and Linear provide the transport; the catalog provides the mapping from domain to external ids so an agent can resolve "the tracker for `orders`" without configuration in prompts. Secrets stay in CI or the agent host, never in knowledge files.
- **Out of scope: chat as a decision channel.** A decision reached in Slack or Teams is not a decision until a human — or an agent draft — writes it as an RFC or Decision Record; chat is at most a raw signal. Approval-by-emoji is explicitly rejected: evidence of approval is a reviewed diff.

## Alternatives

- Confluence or Notion as the canonical store with the repository mirroring *from* it. Rejected: breaks atomic code-and-knowledge changes, has no validator, and forces every agent through vendor auth.
- Bidirectional document sync. Rejected: conflict resolution and format loss (storage formats, tables, Mermaid) guarantee semantic drift within weeks.
- Do nothing. Adopters will integrate anyway through MCP, with tracker content silently outranking specs in whatever prompt reads it last.
- Treat tickets as tasks directly and drop `TASK` documents. Tempting for teams already in Jira; loses the `depends_on` link from work to the spec that justifies it, which is the part reviewers use.

## Open Questions

- Mirror cadence: on promotion only, nightly, or both?
- Should `external_ref` be validated for reachability in CI (requires credentials in CI) or only for shape?
- Which side wins when task status conflicts (repository moved to `done`, tracker still open)? Proposal: the tracker, since it is the declared system of record for status.

## Outcome

Pending review.
