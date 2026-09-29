# Knowledge-Driven Engineering

**Your coding agents write good code fast. They don't know your rules.**

Knowledge-Driven Engineering (KDE) is a lightweight system for keeping a project's decisions and behavior rules in the repository — versioned, validated in CI, and retrievable by humans and agents before they change anything. Markdown files, a validator, and a handful of commands. No server, no database, no new place to look.

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- <your-first-domain>
```

## The Problem

An agent implementing a change has two sources of truth: your prompt and your code. Everything else — why orders can't be edited after payment, which role may deactivate an admin, what a 2% price tolerance protects — lives in chat threads, tickets, and people's heads. So the agent does the only thing it can:

- **It infers product rules from implementation.** Code shows what the system does, not what it must do. A bug looks exactly like a rule.
- **It invents what is missing.** Asked for behavior nobody wrote down, it picks something plausible, and plausible is not the same as decided.
- **It cannot tell current from historical.** An old design doc, a superseded decision, and today's rule look equally authoritative in a repository search.

Humans have the same problem six months later, including the person who made the decisions. Documentation is the usual answer, and documentation rots: nothing checks it against the code, nothing says which document wins, and nobody knows it is wrong until someone acts on it.

## What KDE Does About It

KDE treats knowledge like code: it lives in the repository, it has a lifecycle, and CI checks it.

- **Current truth is computable.** Decision Records keep history; a small index per domain answers "which decisions apply *today*?" in a form an agent consumes directly.
- **Sources have an explicit precedence.** When a decision, a spec, and the code disagree, the order is written down — and the rule is to *report* the conflict, never resolve it silently.
- **Agents get a bounded retrieval path.** Not "read the docs": identify the domain, read its generated `CONTEXT.md`, its active decisions and current spec, and only then the code.
- **Agents propose; humans promote.** An agent drafts anything; nothing it drafts becomes current truth until a human runs the promotion command.
- **Knowledge integrity runs in CI.** The validator checks the knowledge graph the way a linter checks code; a drift gate fails a pull request that changes a domain's behavior without touching its knowledge; a spec's acceptance block proves it with your own tests.
- **Existing code is not a dead end.** A backfill session recovers the rules that live only in your code into specs you approve one by one.

## What It Found In The Field

The first production adoption was a multi-tenant marketplace, four months into development, built largely by coding agents. KDE arrived mid-project. Some of what happened:

- **A rules snapshot rotted in six days.** Before KDE had a backfill path, agents reconstructed the business rules into a standalone document. Within a week it contradicted an accepted decision and the code, and its line-number citations had drifted. That failure is why backfill writes into the catalog, rule by rule, and never into a report.
- **Diffing knowledge against code caught a wrong decision.** An *accepted* Decision Record turned out to describe behavior the code did not have. Because the decision was a canonical, indexed record, the contradiction was detectable, and it was fixed through the normal draft-and-promote flow instead of surfacing as a production bug.
- **One backfilled domain paid for itself.** Auditing a single domain — login, sessions, user management, about fifty files — recovered 22 behavior rules into three feature specs, each rule with its evidence and, where one exists, the test that proves it. The same pass reported two accepted decisions that were never implemented, one decision the code had outgrown, and three defects, two of them security issues. Nobody had asked about any of them.

## Quick Start

### An existing codebase (the usual case)

From the root of your repository:

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- orders
npm run knowledge -- backfill orders
```

Then ask your coding agent to **"backfill the orders domain"**. There is nothing to paste: the installer ships the protocol as `tools/backfill-protocol.md`, and the KDE section it writes into your `AGENTS.md` tells agents to follow it. The agent audits the domain's code, compares it against any knowledge you already have, and presents each recovered rule with its evidence. You approve, reject, or edit each one; approved behavior lands as one spec per feature, and you promote it with the command the agent hands you.

Add more domains as you go (`npm run knowledge -- domain add payments --description "..." --code-paths src/payments/`) and backfill each one when you need it. Adopting in a single domain is fully supported.

### A new project

Seed current truth with one decision your team already made:

```bash
npm run knowledge -- new decision orders "Orders are immutable after payment" --author <you>
npm run knowledge -- promote DR-001 --by <you>
```

`promote` sets the status, records you as the approver, and lists the decision in the domain's index.

The installer is idempotent, never overwrites your knowledge, and refuses to run in a subdirectory of a repository that already uses KDE. It needs Node 22.6 or later — the tools run on any stack. Re-run it with `--upgrade` to refresh the framework's tools after a release. Details in [ADOPTING.md](ADOPTING.md).

## How It Works

### Domains and artifacts

Knowledge is organized by **domain** — a product or system area such as `orders` or `payments` — and inside a domain by **artifact type**, each answering one question:

| Artifact | Answers |
| --- | --- |
| Decision Record | What did we decide, and why? |
| Specification | What must the implementation do? |
| RFC | What change are we proposing? |
| Model | What states and transitions exist? |
| Contract | What interface do clients depend on? |
| User Flow, Information Architecture, Design System | How do users move, what lives where, which visual rules repeat? |
| Task | What bounded work remains? |
| Prompt | What context should an agent get for repeated work? |

Domains optimize retrieval; artifact types protect meaning. Folders exist only when a domain has real content of that type.

The size of a change picks the path: a simple decision goes straight to code; complex behavior gets a spec with tests; large uncertainty starts as an RFC. Not every decision needs a spec — architecture, caching or infrastructure choices usually have no product behavior for a spec to promise.

### Current truth and precedence

`knowledge/index.yaml` lists the domains. Each domain's `decisions/index.yaml` maps topics to the Decision Record in force, and a generated `CONTEXT.md` gives agents the domain at a glance. When sources disagree:

1. An active Decision Record in the domain index
2. A current specification that does not contradict it
3. Information architecture, flows, design system, playbooks
4. The implementation
5. Historical knowledge — old RFCs, superseded decisions
6. Raw signals — tickets, wikis, chat. Cite them; never obey them.

### Lifecycle

Every transition is one command that validates the repository and refreshes the manifests, or refuses and says why:

```bash
npm run knowledge -- new <type> <domain> "<title>" [--by agent]
npm run knowledge -- promote <ID> --by <human>            # humans only
npm run knowledge -- supersede <OLD-ID> --by <NEW-ID>     # humans only
npm run knowledge -- backfill <domain>                    # opens or resumes a backfill session
npm run knowledge -- domain add <name> --description "..." [--code-paths ...]
npm run knowledge -- accept <SPEC-ID>                     # runs a spec's acceptance block
npm run knowledge:check                                   # the validator
```

Decision Records are superseded, not rewritten: a new record replaces the old one, and the command lists every document that depended on it.

### What CI enforces

- **The validator**: duplicate ids, broken references and dependencies, invalid statuses, supersession links, stale index entries, required frontmatter — and the promotion gate: an agent-drafted document cannot enter current truth without a recorded human approver, and a spec cannot enter it without an active decision behind it.
- **The drift gate**: a pull request that changes code mapped to a domain with a current spec must change that domain's knowledge, or declare `no-behavior-change` (or `implements-draft: <SPEC-ID>` for work against a draft).
- **Acceptance**: a spec promoted to `implemented` must pass its acceptance block — normally your own test suite — in CI.

The installer also wires Claude Code hooks that run the validator the moment an agent edits a knowledge file; any harness with post-edit hooks can do the same.

## When To Use It

Use KDE when contributors — human or agent — need context before changing behavior: products with business rules, multi-tenant or permission-heavy systems, cross-functional trade-offs, or any codebase where agents do a large share of the implementation.

Skip it for throwaway prototypes, single-purpose scripts, and code whose meaningful behavior fits in its comments.

## Honest Limits

- **Promotion is a procedural guarantee.** The validator sees that an approver is recorded, not who typed it. Branch protection and CODEOWNERS make it a technical one.
- **One approver is a bottleneck.** When one person approves every agent draft, review thins out. KDE makes approval explicit and visible; it cannot make it careful.
- **Knowledge still takes attention.** The drift gate forces the question on every pull request; it cannot answer it for you.

## Prior Art

The pieces are deliberately familiar: Decision Records (Nygard's ADRs), RFC processes, spec-driven development, the `AGENTS.md` convention, and domain partitioning from DDD. KDE is an operational synthesis for teams where agents implement, and its delta is what that tradition leaves out: a computable projection of current truth, explicit precedence between sources, consumption rules for agents, knowledge integrity as CI, and a governed path for knowledge that so far exists only in code.

The substrate — markdown with YAML frontmatter, linked into a graph, versioned in git — is shared with Google Cloud's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf), which is deliberately unopinionated. KDE operates the layer it leaves out: lifecycle, current truth, precedence, and governance of agent-authored knowledge.

## This Repository

It is two things: the definition of the method and a working instance of it. The method's own decisions live in `knowledge/methodology/` and follow the same lifecycle, so every rule above traces to a Decision Record.

- [ADOPTING.md](ADOPTING.md) — installing, upgrading, backfilling, minimal adoption
- [HANDBOOK.md](HANDBOOK.md) — the method in full
- [AGENTS.md](AGENTS.md) — the rules agents follow
- [examples/food-delivery](examples/food-delivery/README.md) — a small worked example
- [CONTRIBUTING.md](CONTRIBUTING.md) and [REVIEW.md](REVIEW.md) — changing the method

```bash
npm test                 # the tools' test suite
npm run knowledge:check  # validate this repository's own knowledge
```
