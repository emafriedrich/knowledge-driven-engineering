---
id: KDE-RFC-019
title: Agents promote a spec to implemented when its acceptance block is the one a human approved
status: rejected
created: 2026-10-01
updated: 2026-10-01
drafted_by: agent
approved_by: []
motivated_by: "`promote` only requires --by to be non-empty, so the human-only rule of DR-007 is not enforced; and `current -> implemented` is already decided by running the acceptance block, not by who signs it"
scope: [methodology]
tags: [rfc, lifecycle, agents]
depends_on: []
related: [DR-007, DR-015, DR-016, DR-020, KDE-FLOW-001]
authors: [emafriedrich]
---

# RFC: Agents promote a spec to implemented when its acceptance block is the one a human approved

## Summary

Let an agent run `knowledge promote <SPEC-ID> --to implemented` without a human signature, but only when the spec's ```acceptance``` block is, after normalization, the exact set of commands a human approved when the spec became `current`. Every other promotion stays human. Recorded so the idea is not proposed again without its reasons.

## Problem

A spec goes through two transitions of different kinds. `draft -> current` is an approval: a product judgement that belongs to a person. `current -> implemented` is a fact the framework already refuses to take on trust: `promote` runs the acceptance block and refuses on failure (DR-015). The `--by` value adds nothing to that verification.

Meanwhile the human-only rule is not enforced. `commandPromote` only checks that `--by` has some value, so an agent passing `--by <owner>` promotes anything, `draft -> current` included. DR-016 already says this guarantee is procedural, not technical.

## Proposal

- **A signature on the block.** When a human promotes a spec to `current`, the tool writes `acceptance_sha: sha256(acceptanceCommands(content).join('\n'))`. It covers exactly the commands that run: reindenting, blank lines, `#` comments, line endings and prose outside the block leave it unchanged. Adding, editing, removing or reordering a command changes it.
- **An agent principal.** `--by agent:<name>` names an agent. Agents are refused for every active status, and for `--to implemented` unless the recomputed hash matches the stored one. The match is checked before anything runs. On a mismatch the agent gets the expected hash, the actual hash and the current commands.
- **What an agent writes.** `implemented_by: agent:<name>`; `approved_by` and `authors` stay untouched, since approving stays human. A human promotion to `implemented` rewrites the hash, which is how specs that are already `current` adopt it.
- **The validator.** It rejects a malformed `acceptance_sha`, the field on a document that is not a spec, and an `implemented` spec whose hash no longer matches its own block, so CI fails when someone edits both together.

Known limits stated by the proposal itself:

1. The hash freezes *what runs*, not *how well it proves*. An empty test under an approved command still passes.
2. An agent with write access can edit the block and the hash in one commit. Only the visible diff and the validator in CI stop it.

## Alternatives

- **Keep promotion human for every transition.** This is today's rule (DR-007, DR-015, DR-016). It costs a human review each time a spec is closed.
- **Hash the whole document.** Rejected inside the proposal: spec prose is corrected all the time, and asking for a signature over a comma turns the mechanism into noise people learn to skip.
- **Flag weak acceptance commands heuristically** (an `echo` blacklist and the like). Rejected inside the proposal: the mechanism is the signature, not guessing.

## Open Questions

None left open; see Outcome.

## Outcome

Rejected by emafriedrich on 2026-10-01, before any implementation. Reasons:

- **It contradicts three accepted decisions.** It would have had to narrow them explicitly. DR-007 says *"an agent may propose everything and promote nothing"*. For `--to implemented` specifically, DR-015 says *"passing checks are evidence; promotion remains human"*. DR-016 says agents *"never promote on a human's behalf"* and that *"no identity or signature mechanism is added"*.
- **It does not close the door it claimed to close.** `agent:` is declared by the caller. An agent that passes `--by <owner>` is still taken for a human at every destination, so the change opens a path for honest agents without stopping a dishonest one. This is the same limitation as `drafted_by` (DR-007), and the proposal would have added a signature mechanism without removing it.
- **Human review is the point, not overhead.** Closing a spec means a person has looked at the code, the tests and the claim that they prove the spec. The maintainer keeps that review for this repository and asks adopters to do the same. The accepted risk is the one DR-016 already names: the human-only rule is procedural, and it is backed by repository protections (CODEOWNERS, branch protection), not by the tool.

No decision record follows. DR-007, DR-015 and DR-016 stand unchanged.
