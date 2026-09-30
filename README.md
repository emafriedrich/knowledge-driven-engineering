# Knowledge-Driven Engineering

**Your coding agents write good code fast. They don't know your rules.**

Knowledge-Driven Engineering keeps a project's decisions and behavior rules in the repository as markdown — versioned, validated in CI, and read by agents before they touch code. Agents draft; humans promote; a validator and a drift gate keep the knowledge and the code from disagreeing silently.

No server, no database. Markdown files, one validator, a handful of commands.

> **Status:** early. One production adoption, API may change between commits. Pin a commit if you depend on it.
> **License:** [MIT](LICENSE)

## What it looks like

A real decision record, from the `businesses` domain of the first production adoption ([full file](examples/marketplace/knowledge/businesses/decisions/MP-DR-034-orders-are-only-accepted-while-the-business-is-open-by-sched.md)):

```markdown
---
id: MP-DR-034
title: Orders are only accepted while the business is open by schedule and by its manual switch
status: accepted
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
depends_on: [MP-DR-033]
related: [MP-DR-030]
---

## Context
Today "open/closed" is only the manual `isOpen` flag; the weekly schedule
never blocks anything, and checkout doesn't check `isOpen` either. A customer
can order at 3 a.m. from a place that closed at midnight.

## Decision
1. Whether the business accepts orders is computed, not stored, as one
   `availability` value: `open`, `closed_by_schedule` or `closed_by_merchant`.
   The manual switch can only close the business, never open it outside
   the schedule.
2. The API enforces it at checkout: `orders.business_closed`, HTTP 409,
   with `reason` and `nextOpensAt`. The storefront check is convenience only.
4. Only creation is blocked. A cart opened at 23:58 and submitted at 00:01
   is rejected.
(rules 3, 5, 6 and consequences in the full record)
```

The agent drafted it; a human approved it; the validator refuses any record with `drafted_by: agent` and no approver. Before touching checkout, an agent reads the domain's generated `CONTEXT.md` — the decisions in force, and what is explicitly *not* truth yet:

```markdown
## Active decisions
| Topic | ID | Title | Updated |
| schedule | MP-DR-033 | Merchants edit their weekly schedule from settings | 2026-09-25 |
| availability | MP-DR-034 | Orders are only accepted while the business is open ... | 2026-09-25 |
| visibility | MP-DR-030 | Business visibility states: active, open and published | 2026-09-25 |
(ten in total)

## Pending — NOT current truth, do not obey
- `MP-DR-053` (draft, agent-drafted): Backfill baseline for businesses
- `MP-RFC-005` (draft, agent-drafted): Multi-branch businesses
```

That domain reads in ~8k tokens. Reconstructing the same rules from its ~50 files of code took an agent ~130k (n=1, one-time extraction — see [in the field](ADOPTING.md#in-the-field)).

## Why knowledge drifts

Writing the rules down is the easy part. The hard part is that they stop being true: someone changes checkout and nobody touches the decision that governs it, or an agent reads the rules at the start of a session and, a hundred thousand tokens later, implements something else. A human discounts a stale document. An agent obeys it literally, and a rule that no longer holds looks exactly like one that does. That is drift, and discipline does not fix it. What has held up is mechanical: a change to governed code cannot merge without touching the knowledge that governs it, or saying out loud that it does not need to. [More on drift, and what the gate does not catch](DRIFT.md).

## Three documents, and who writes which

You don't need to know what an RFC is to use this. There are three kinds of document that matter, and the agent picks the right one for you.

**Decision Record (DR) — a settled rule, and why.** One decision, written once, never edited: if it changes, a new record supersedes it. Read it when you need to know *what is true*.
*Example:* [MP-DR-034](examples/marketplace/knowledge/businesses/decisions/MP-DR-034-orders-are-only-accepted-while-the-business-is-open-by-sched.md) — "orders are only accepted while the business is open". Context (customers ordering at 3 a.m.), the rule, its consequences.

**RFC — a proposal with open questions.** Nothing in it is true yet. It lays out a problem, options, and the questions a human has to answer before anything gets decided. When it's accepted, it becomes one or more Decision Records.
*Example:* [MP-RFC-005](examples/marketplace/knowledge/businesses/rfcs/MP-RFC-005-multi-branch-businesses.md) — "multi-branch businesses". Should a brand with two locations be one tenant with two branches, or two businesses? Draft, unanswered, explicitly *not current truth*.

**Spec — how a decision behaves in detail.** Only for decisions with enough rules, edge cases and invariants that reconstructing them from code would be a risk. It carries an acceptance block (normally your tests), so "implemented" is proven, not declared.
*Example:* [MP-SPEC-004](examples/marketplace/knowledge/businesses/specs/MP-SPEC-004-business-deactivation-and-publishing.md) — what deactivating a business does to the database, the API and the events, rule by rule, with what was removed and what replaces it.

**The agent decides which one.** When you ask for a change, the agent reads the domain's knowledge and:

- If the request is clear and the rule is settled, it drafts a **Decision Record**.
- If anything is ambiguous — two reasonable readings, a rule it isn't sure applies, a trade-off you haven't stated — it drafts an **RFC with the open questions** and hands them to you. It does not pick an answer on your behalf, ever.
- Once a decision is promoted, if the behavior is more than a couple of rules, it drafts a **Spec** anchored to that decision before implementing.

In practice this means the agent asks more than you're used to, and every question is one it would otherwise have answered silently in code.

## Quick start

Requires Node 22.6+ (only for the tools; your project can be any stack).

**Existing codebase** — from the repo root:

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/v0.8.0/install.sh | bash -s -- orders
npm run knowledge -- backfill orders
```

Then tell your agent: *"backfill the orders domain"*. It audits the domain's code, presents each recovered rule with its evidence, and you approve, reject or edit them one by one. Approved rules land as specs; you promote them with the command the agent hands you.

**New project** — same install, then record the first decision your team already made:

```bash
npm run knowledge -- new decision orders "Orders are immutable after payment" --author <you>
npm run knowledge -- promote DR-001 --by <you>
```

The installer is idempotent, never overwrites your knowledge, and adds a Knowledge-Driven Engineering section to `AGENTS.md` plus Claude Code hooks that run the validator on every knowledge edit. Other harnesses with post-edit hooks can be wired the same way. Details in [ADOPTING.md](ADOPTING.md).

### Minimal adoption

You can run decision records alone. Install as above, skip specs, and leave `code_paths` unset. Each decision your team makes is one `new decision` plus one `promote`; the domain's `decisions/index.yaml` and generated `CONTEXT.md` tell agents which decisions are in force, and the Precedence section in `AGENTS.md` tells them what wins on conflict. The drift gate never fires: it only gates domains that have specs and declared `code_paths`. Add specs and code paths later, one domain at a time, when a decision's behavior outgrows a code comment. Details in [ADOPTING.md](ADOPTING.md#minimal-adoption).

## How it works

**Domains.** Knowledge is split by product area (`orders`, `payments`). Each domain has decision records, optionally specs and RFCs, and a generated `CONTEXT.md`. Other artifact types (models, contracts, flows, tasks, prompts) exist for when you need them — see the [handbook](HANDBOOK.md#artifacts).

**Precedence.** When sources disagree, the order is fixed and agents must report the conflict, never resolve it:

1. Active decision record
2. Current spec
3. Flows, IA, design system, playbooks
4. The code
5. Historical knowledge (superseded decisions, old RFCs)
6. Tickets, wikis, chat — cite, never obey

**Lifecycle.** One command per transition; each validates and refreshes the indexes or refuses and says why.

```bash
npm run knowledge -- new <type> <domain> "<title>" [--by agent]
npm run knowledge -- promote <ID> --by <human>
npm run knowledge -- supersede <OLD-ID> --by <NEW-ID>
npm run knowledge -- accept <SPEC-ID>        # runs the spec's acceptance block
npm run knowledge:check                      # the validator
```

Decisions are superseded, never rewritten.

**CI.**
- The **validator** checks ids, references, statuses, supersession links, stale indexes, frontmatter — and that nothing an agent drafted enters current truth without a recorded human approver.
- The **drift gate** is the answer to [drift](DRIFT.md): a PR that changes code mapped to a domain with a current spec fails unless it also changes that domain's knowledge or declares `no-behavior-change`. It checks the result, not the process, so it catches a divergence that took a week and one that took twenty minutes of a saturated session alike.
- **Acceptance**: a spec marked `implemented` must pass its acceptance block, normally your own tests.

## When to use it — and when not

Use it for products with business rules, multi-tenant or permission-heavy systems, or any codebase where agents do most of the implementation.

Skip it for prototypes, scripts, and code whose behavior fits in its comments.

## Honest limits

- **Promotion is procedural.** The validator sees that an approver is recorded, not who typed it. Branch protection and CODEOWNERS make it real.
- **The drift gate can be rubber-stamped.** `no-behavior-change` will get pasted by reflex the same way `skip-changelog` does. Mitigation so far: the declaration sits in the PR description where reviewers see it, and the gate prints it in the CI log. Nothing counts how often each author reaches for it.
- **One approver is a bottleneck.** The method makes approval explicit; it cannot make it careful.

## How it compares

Versus **ADRs + AGENTS.md** alone: those record decisions and instruct agents, but nothing computes which decisions are current, nothing fails a PR when code and decisions diverge, and nothing gates agent-written knowledge behind a human.

Versus **spec-driven tools** (Spec Kit, Kiro specs, OpenSpec, Cursor rules): those drive one task from a spec. Knowledge-Driven Engineering is the persistent layer underneath — decisions with history, precedence between sources, and a backfill path for rules that only exist in code.

Versus **OKF** (Google Cloud): same raw material, different half of the problem. OKF standardizes how knowledge is written so any tool can read it; the method governs whether you can trust it. [Detailed comparison](HANDBOOK.md#relation-to-okf).

## This repository

Both the definition of the method and a working instance of it: the method's own decisions live in `knowledge/methodology/` under the same lifecycle.

- [ADOPTING.md](ADOPTING.md) — install, upgrade, backfill, what happened in the first production adoption
- [HANDBOOK.md](HANDBOOK.md) — the method in full
- [AGENTS.md](AGENTS.md) — the rules agents follow
- [examples/marketplace](examples/marketplace/README.md) — one real domain: ten decisions, two specs, two RFCs, backfill baseline
- [CONTRIBUTING.md](CONTRIBUTING.md) · [REVIEW.md](REVIEW.md)

```bash
npm test                 # the tools' test suite
npm run knowledge:check  # validate this repo's own knowledge
```