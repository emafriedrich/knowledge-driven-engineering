---
id: KDE-RFC-020
title: "Architecture documents: teams state their layout rules in their own words; KDE makes them verifiable"
status: draft
created: 2026-10-28
updated: 2026-10-28
drafted_by: agent
approved_by: []
motivated_by: Field use — every agent session on an adopting codebase re-derives the project layout by walking directories and reading code. The result is expensive, repeated, and wrong often enough to matter — files land in the wrong folder, raw SQL appears outside repositories, module conventions erode one commit at a time. The catalog records what the system does (specs, decisions) but nothing records how the code is organized, so there is nothing for the agent to read and nothing for the tooling to verify.
scope: [methodology]
tags: [rfc]
depends_on: [DR-005, DR-007, DR-008, DR-018]
related: [DR-003, DR-009, DR-013, KDE-RFC-013, KDE-SPEC-001]
---

# RFC: Architecture Documents — Teams State Their Layout Rules In Their Own Words; KDE Makes Them Verifiable

> Draft. The direction is set; the shape is deliberately left open. Nothing below fixes a schema, a rule vocabulary or a command name.

## Summary

Add an **architecture** document, one per domain, that records how the domain's code is organized: where things live, what files are called, which markdown files agents must find, and whatever conventions the team cares about. The team writes those conventions **in its own words**. KDE's job is not to supply the rules; it is to take the team's rules, propose a verifiable form for each one, try it against the real tree, and iterate with the team until the rule is **deterministic** — it passes or fails with no judgment call — or until the team agrees it stays prose. Agents then read the document from the context receipt instead of re-deriving the layout from the directory tree every session. Brownfield adoption drafts the document from the existing tree; a human promotes it, as with every other artifact.

## Problem

KDE answers "what does the system do" (specs, decisions, contracts) and "what changed without its knowledge" (the drift gate). It does not answer "how is the code organized", and that gap costs on every session:

- **The layout is re-derived each time.** An agent that needs to add a repository, a migration or a handler walks the tree, samples a few files, and infers the convention. That is slow, it is paid again next session, and the inference is wrong often enough that conventions erode one commit at a time.
- **Nothing records the conventions, so nothing can enforce them.** "SQL lives in repositories", "every module has a README for agents", "migrations go under `db/migrations/`" exist only in reviewers' heads. The drift gate cannot help: it fires on behavior, and a file in the wrong folder changes no behavior.
- **An architecture document without enforcement is worse than none.** Architecture prose is the fastest-rotting document in any repository. If agents are told to trust it instead of the tree, a stale document is read with full confidence and the agent stops looking at reality.
- **A fixed rule vocabulary would be the wrong fix.** Every team has conventions the framework's authors did not think of. A closed list of rule types either leaves those out or grows into a linter. The framework should accept the team's rules as the team states them and work towards making them checkable, not the other way round.

## Proposal

The proposal is a **cycle**, not a schema. Each step is stated as an outcome; how the tooling achieves it is left for implementation and field use.

1. **The team states its rules in natural language.** In its own prompt, in the architecture document, or in a backfill session: "no raw SQL outside repositories", "we are ORM-only, no SQL anywhere", "every module has a README that says what it owns", "migrations only under `db/migrations/`", "the top level of `src/` is exactly these folders". Any rule, in any words. KDE ships **no rules of its own**; the examples in this RFC are ideas, and a team may say "none of these fit" and write its own.
2. **KDE structures each rule as best it can.** For every rule the agent proposes a verifiable form — most will reduce to a path pattern, a file-name pattern, a content pattern restricted to some directories, a required file, or a closed list of directories, but the form is whatever the rule needs. The agent states plainly what the proposed check would and would not catch.
3. **The check is tried against the real tree.** The agent runs it, shows the team what it flags today, and marks what is a true violation, what is a false positive, and what the rule in its stated form cannot see. This is where "no SQL outside repositories" becomes "SQL keywords in a comment also match; do we ignore tests?".
4. **Iterate until deterministic, or stop honestly.** The rule and its check are refined together until the check passes or fails with no judgment call. A rule that cannot reach that point in a language-independent form — dependency direction, layer boundaries, "a service must not know about HTTP" — **stays prose**, marked as not enforced, for the agent to read and a reviewer to apply. The framework never pretends to verify what it cannot.
5. **Deterministic rules are enforced by the machinery that exists.** `knowledge:check` evaluates them against the files under the domain's `code_paths`; the hook evaluates the file just edited; CI runs the full check, as it does today for knowledge drift (DR-008). A violation names the rule, the file, and what to do instead. Inherited violations in a brownfield tree are recorded as exceptions at adoption, so the check stops new ones without demanding the old ones be fixed first.
6. **Agents read the document; humans own it.** The architecture document joins the context receipt. Agents draft and update it with `drafted_by: agent`; promotion is a human's (DR-007). The brownfield flow of KDE-RFC-013 gains a step before behavior recovery: *map the layout* — the agent proposes the document from the actual tree, lists the conventions it observes, and the team confirms, rejects or rewrites each one in its own words. A knowledge graph of the codebase, where one exists, is a reasonable first draft of the module list; it is scaffolding, not truth.

**The one firm boundary.** A deterministic check may read paths, file names and file content with pattern matching. It may not parse a language: no imports, no symbols, no types. If a rule needs a parser, it belongs in the project's own linter, which the framework already treats as the place for language-specific checks. This keeps the tooling at the size DR-003 allows and makes the promise honest on every language at once.

**Ideas, not a vocabulary.** Shapes that many team rules are likely to reduce to, offered as starting points only:

- *placement* — files of a kind live only under certain directories (`*.sql` only under repositories; migrations only under `db/migrations/`)
- *naming* — files under a directory follow a name pattern (`*.repository.*`; kebab-case under `src/`)
- *content location* — a content pattern is allowed only in some places, or nowhere (raw SQL only in repositories; no SQL at all when ORM-only; environment reads only under `config/`; HTTP client calls only under `clients/`)
- *required files* — every directory of a kind contains a file (every module has a `README.md` or `AGENTS.md` for agents)
- *closed layout* — the directories directly under a path are a fixed list, so a new folder is a documented change, not an accident

Whether these become named kinds in a schema, or the agent simply writes whatever check fits, is left open.

## Alternatives

- **Status quo: let the agent walk the tree.** Pays the derivation cost every session and lets conventions erode silently. Field use is the motivation.
- **Architecture prose only, no verification.** Rejected: unenforced architecture documents rot fastest, and an agent instructed to trust a stale document is worse off than one reading the tree. The cycle towards deterministic checks is what keeps the prose honest.
- **A fixed rule vocabulary shipped by KDE.** Rejected as the starting point: it either leaves out the conventions a real team has or grows into a linter. The team states the rules; shapes may be named later if field use shows the same few recurring.
- **A full architecture linter (dependency direction, layer boundaries, import rules).** Rejected: requires a parser per language, grows the tooling past what DR-003 allows, and produces the false positives that teach teams to wave gates through. Teams that want it have language-specific tools; the framework should not compete with them.
- **Rules in `package.json` or a separate config instead of the document.** Rejected: rules without the prose that explains them are a linter config, not knowledge. They would have no lifecycle, no approver, no place in the receipt and no precedence when they disagree with a decision.
- **One architecture document for the whole repository.** Rejected as the default: it couples unrelated modules into one lifecycle and one approver, against DR-005. A repository-level document may exist for cross-domain layout; domains own the rest.

## Open Questions

Deliberately many. This draft sets the direction and leaves the rest for a later pass.

- **Where do the deterministic checks live once agreed?** In the architecture document's frontmatter, in a sibling file, or generated? The only requirement so far is that they stay governed with the prose that explains them.
- **How is "deterministic" judged?** By the team at the end of step 4, or by a mechanical test (the check runs with no agent involvement)? Proposal: the latter is the definition; the former is who decides to stop iterating.
- **Severity during adoption.** Errors from the first promotion with inherited violations recorded as exceptions, or a warning period? Proposal: errors plus explicit exceptions, so "warning for now" never becomes permanent.
- **What happens to a rule that stays prose?** It is read by agents and applied by reviewers, but nothing enforces it. Should the document mark it visibly ("not verified"), so nobody mistakes it for a checked rule?
- **Does KDE ever ship a default rule?** For example "every domain with `code_paths` has an accepted architecture document", or "every module has a markdown file for agents". Undecided; leaning no, so the framework stays a method and not a style guide.
- **Can the cycle be driven by a command** (`knowledge architecture <domain>`, in the spirit of `backfill`), or is it a prompt the agent follows? Undecided.

## Outcome

Pending review.
