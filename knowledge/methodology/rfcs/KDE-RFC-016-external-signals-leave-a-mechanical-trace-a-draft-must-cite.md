---
id: KDE-RFC-016
title: "External signals leave a mechanical trace: a draft must cite the ticket the work came from"
status: draft
created: 2026-09-30
updated: 2026-09-30
drafted_by: agent
approved_by: []
motivated_by: Maintainer question (2026-09-30) — whether turning a ticket into a Decision Record or RFC, and catching a contradiction between the ticket and current truth, is deterministic; it is not, it rests on the agent following KDE-PLAYBOOK-001 and DR-019, and a missed ticket leaves no trace
scope: [methodology]
tags: [rfc, agents, integration]
depends_on: []
related: [DR-008, DR-014, DR-019, KDE-PLAYBOOK-001, KDE-RFC-015]
---

# RFC: External signals leave a mechanical trace: a draft must cite the ticket the work came from

## Summary

When a pull request names a ticket from a tracker the domain declares, and it changes code under that domain's `code_paths`, the drift gate requires some knowledge document to cite that ticket, or the pull request to say why none is needed. The agent's judgment (which artifact, whether the ticket contradicts current truth) stays judgment; what becomes mechanical is that a ticket cannot drive code without leaving a trace in the knowledge.

## Problem

KDE-PLAYBOOK-001 tells an agent what to do with a ticket: read the domain first, quote rather than obey, and draft one Decision Record, RFC or task per cluster of signals. DR-019 tells it to draft an RFC and stop when the request is ambiguous. Both are prose. An agent that reads a ticket, sees nothing new in it, and goes straight to code leaves nothing behind: the decision someone took in a meeting and wrote in the ticket lives only in the tracker, and the code implements it without citing it. This is the most common way decisions taken outside the repository drift away from it.

Two parts of the problem cannot be mechanized and this RFC does not try: deciding which artifact fits, and noticing that a ticket contradicts a current spec. Both need reading. What can be checked is the trace.

## Proposal

- **The trigger is the pull request, not the conversation.** The gate already reads the pull request body (DR-008, DR-015). If the body or the branch's commit messages contain a key of a tracker the catalog declares for a touched domain (`trackers: { jira: PD }` makes `PD-123` a key), the pull request names a ticket.
- **The obligation.** For each ticket named, some document in the domain must cite it, in `motivated_by` or `external_ref`, either already in the repository or added in the pull request. Otherwise the gate fails and names the ticket.
- **The escape, visible like the others.** `no-knowledge: PD-123 <reason>` in the body satisfies it for that ticket ("typo fix", "the rule is already DR-023"). It is printed in the CI log, the same as `no-behavior-change`.
- **No tracker API.** The gate never calls Jira; it reads text it already has. External systems stay signals (DR-014), and the check works offline.
- **Only for declared trackers.** A domain with no `trackers:` entry is untouched, so the check costs nothing to teams that don't use one.

## Alternatives

- **Status quo: the playbook alone.** Works when the agent follows it; leaves no trace when it doesn't, and nobody notices.
- **A hook that detects tracker links in the user's prompt.** Some harnesses offer a prompt hook that could see a pasted link and remind the agent of the playbook. Worth having as a nudge, but not every harness has one, and a conversation is not something the repository or CI can check later.
- **Require a Decision Record for every ticket.** Most tickets are work justified by existing truth; this would flood the repository with records that only restate the ticket.
- **Detect contradictions mechanically**, by comparing the ticket to the spec. Needs reading the ticket and judging meaning; not deterministic, and it would call the tracker.

## Open Questions

- **Where tickets are named.** Pull request body only, or commit messages and branch name too? Branch names like `PD-123-fix-search` are common and would catch more; they would also catch tickets the author never meant to cite.
- **Is an existing citation enough?** A ticket already cited by an old record satisfies the check even if the new code does something else. Accept it (the trace exists) or require the citing document to be touched in the pull request?
- **Does a draft count?** A draft RFC citing the ticket is a trace, and implementing against it is already governed by DR-015. Propose yes.
- **Trackers without keys.** Linear and Jira have keys; Notion or a Confluence page has a URL. Match declared URL prefixes too, or keys only for a first version?

## Outcome

<!-- Fill after review: accepted, rejected, or deferred, with links to resulting decisions/specs. -->
