# Adopting Knowledge-Driven Engineering In Your Project

This repository is two things at once: the definition of the method (HANDBOOK.md, the `methodology` domain) and a reference implementation you can copy pieces from. Adopting the method never means cloning this repository into yours. Your project only needs the **scaffold**: the knowledge tree, the templates, the validator, and the agent rules.

## What Your Project Needs

```text
your-project/
+-- AGENTS.md                  <- retrieval order + precedence sections
+-- knowledge/
|   +-- index.yaml             <- your domain catalog
|   +-- <your-domain>/
|       +-- README.md
|       +-- decisions/
|           +-- index.yaml
+-- templates/                 <- copied from this repo
+-- tools/knowledge-check.mts   <- copied from this repo
+-- .github/workflows/ci.yml   <- runs the validator
```

What you do **not** copy: HANDBOOK.md, the `methodology` domain, `examples/`, `tests/`. Those define and exercise the method itself; link to them instead of vendoring them.

## One-Command Install

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/v0.8.0/install.sh | bash -s -- <your-first-domain>
```

`install.sh` performs the manual steps below, is idempotent, and never overwrites an existing file (it skips and tells you). It detects your package manager (npm, pnpm — workspaces included, yarn, bun) for the `yaml` dependency, and a dependency failure warns instead of aborting the install. Run it from the root of your repository; pass your first domain name as the argument. It refuses to run in a subdirectory of a repository that already runs Knowledge-Driven Engineering — a second catalog nothing reads — and names the directory to run it from. The argument only seeds a fresh install: on a repository that already has `knowledge/index.yaml` the installer creates no domain and points you to `npm run knowledge -- domain add <name>`. Installing, upgrading (`--upgrade`) and adding a domain are three separate actions. Offline installs work from a local clone: `KDE_SOURCE=/path/to/clone bash install.sh <domain>`. The script installs the release it belongs to (the tag in its own URL); to install another release, a branch or a commit, set `KDE_VERSION=main` (or `KDE_VERSION=v0.7.2`) in front of the command.

## Upgrading

The installer classifies what it writes by owner (DR-011):

- **Framework-owned** — `tools/knowledge-check.mts`, `tools/knowledge-context.mts`, `tools/knowledge.mts`, `tools/drift-gate.mts`, `tools/knowledge-hook.mts`, `.github/workflows/kde.yml`, the `<!-- kde:begin -->` … `<!-- kde:end -->` section of `AGENTS.md` (DR-017), and the Knowledge-Driven Engineering hook entries in `.claude/settings.json`. Every copy carries a `kde-version: X.Y.Z` marker on its first line.
- **Adopter-owned** — everything under `knowledge/`, `templates/`, `AGENTS.md` outside the kde markers, and your `package.json` beyond the `knowledge`, `knowledge:check` and `knowledge:context` scripts. Never touched, on any run. Templates are yours to shape to your team's conventions; the validator, not the template text, enforces KDE-SPEC-001.

Every run compares the installed markers with the fetched version and warns when a framework-owned file differs — whether from a newer release upstream or a local edit. To refresh them:

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/v0.8.0/install.sh | bash -s -- --upgrade
```

`--upgrade` replaces framework-owned files that differ and reports each one (`upgrade tools/knowledge-check.mts (0.1.0 -> 0.2.0)`). A framework-owned file you edited locally is overwritten too, with an explicit `WARN` line naming it. Framework-owned files are not an extension point: if you need different validation behaviour, fork this repository and install from your fork; if the change would help everyone, contributions are welcome. Adopter-owned files are not touched by `--upgrade`. Templates are never overwritten; the installer prints a `note` line for each one that differs from the release, with the upstream URL, so you can decide whether to adopt the newer shape. Without branch protection and CODEOWNERS, human-only promotion is a procedural guarantee: the validator sees that an approver is recorded, not who typed it. New template files that a release adds (as `templates/model.md` and `templates/contract.md` were) arrive on a plain run, because the installer adds any file that does not exist yet.

## Manual Steps

1. **Create the knowledge tree.** `knowledge/index.yaml` with your first domain (a real product or system area — `storefront`, `payments`), plus that domain's `README.md` with its retrieval path.
2. **Copy `templates/`** from this repository. Fill templates by replacing placeholder values; the frontmatter must stay at the top of the file.
3. **Copy `tools/knowledge-check.mts`**, add the `yaml` dependency, and add the script to your `package.json`:

   ```json
   "scripts": { "knowledge:check": "node --experimental-strip-types tools/knowledge-check.mts" }
   ```

   Non-Node projects can run it with any Node >= 22.6 installed; the tool has one dependency.
4. **Wire CI.** Copy `.github/workflows/ci.yml` (or the equivalent in your CI) so every PR runs `knowledge:check`. Without CI the method is an honor system. Copy `tools/knowledge-context.mts` and `tools/drift-gate.mts` too, declare `code_paths` on your domains, and add a CODEOWNERS file plus branch protection so knowledge promotion requires owner approval.
5. **Add the agent rules.** Copy the section `install.sh` writes — from `<!-- kde:begin -->` to `<!-- kde:end -->`, markers included — into your project's `AGENTS.md`. The markers are what lets `install.sh --upgrade` refresh the rules later (DR-017); put rules of your own outside them.
6. **Seed current truth.** Write the first Decision Record for a decision your team already made, list it in the domain `decisions/index.yaml`, and anchor the domain in `knowledge/index.yaml`. One real decision beats ten empty folders.
7. **Grow on demand.** Add artifact folders (`specs/`, `flows/`, `rfcs/`) only when the domain has real content of that type, and new domains only when work needs a stable retrieval boundary.

## Adopting On An Existing Codebase (Backfill)

Step 6 assumes you remember your decisions. On a codebase that has been shipping for months, much of the knowledge exists only in code — and that is the default adoption, not the exception. Recover it with a backfill session (DR-018) instead of documenting from now on and leaving the past dark:

```bash
npm run knowledge -- backfill <domain>
```

The first run scaffolds `knowledge/<domain>/backfill.yaml` (session state) and a draft **baseline Decision Record** stating that the rules about to be recovered describe observed behavior at adoption time, with no reconstructed rationale. The command audits nothing itself. Ask your coding agent to backfill the domain — there is nothing to paste: the installer ships the protocol as `tools/backfill-protocol.md` and the framework-owned section of your `AGENTS.md` tells agents to follow it. The agent audits the domain's code, diffs what it finds against any existing knowledge, and presents each rule one at a time — the rule, its evidence (paths, symbols, test names; never `file:line`), and any conflict. You approve, reject, or edit each rule as you see it; running the `promote` command the agent hands you is the approval.

Approved behavior lands as **one spec per feature** anchored to the baseline record, born with its proving test named in Acceptance Checks. Architectural stances (infrastructure, caching, eventing) become their own Decision Records. Nothing lands in a standalone report: a snapshot document has no per-rule lifecycle and starts contradicting the code within days, while the generated `CONTEXT.md` already gives you the readable summary for free.

Interrupted sessions resume: re-running the command reports what is approved, rejected, and still pending, so the agent presents only the remainder. Backfilling one domain and leaving the rest of the codebase unmapped is fully supported — the drift gate ignores code outside cataloged `code_paths`.

## Lifecycle Commands

`npm run knowledge -- <command>` performs each lifecycle transition as one step and leaves the repository valid or explains why it refused:

```bash
npm run knowledge -- domain add orders --description "Order lifecycle" --code-paths src/orders/
npm run knowledge -- backfill orders
npm run knowledge -- new decision orders "Orders are immutable after payment" --author <you>
npm run knowledge -- promote DR-001 --by <you>
npm run knowledge -- supersede DR-001 --by DR-002 --approved-by <you>
npm run knowledge -- renumber DR-002 DR-010
npm run knowledge -- done TASK-004
npm run knowledge -- accept SPEC-001
npm run knowledge -- promote SPEC-001 --by <you> --to implemented
```

The CI workflow the installer writes runs the drift gate on pull requests — code changes in a domain must come with a knowledge change, a `no-behavior-change` declaration, or, when the domain's specs are still drafts, an `implements-draft: <SPEC-ID>` declaration — and re-runs the acceptance block of any spec a pull request promotes to `implemented`.

Agents use `new`, `domain add` and `renumber` (with `--by agent` on what they draft); `promote` and `supersede` are for humans, and the AGENTS.md section the installer writes says so. Ids are allocated by scanning the catalog and git history; when two branches still collide, the validator reports the duplicate and `renumber` fixes it in one command.

## Harness Enforcement (Optional)

CI is the hard guarantee, but it fires at PR time. Coding-agent harnesses with lifecycle hooks can run the same validator **in-session**, so an agent sees an integrity error seconds after introducing it instead of after pushing. The rule of thumb: anything you can enforce with hooks, do not leave as prose.

This repository ships a working example for Claude Code:

- `tools/knowledge-hook.mts` reads the hook payload and runs the validator only when the touched file (or, on session stop, the pending working-tree changes) involves knowledge artifacts. It is silent on success, so the happy path costs no agent context, and it exits non-zero with the error list on failure, which the harness feeds back to the agent.
- `.claude/settings.json` wires it to `PostToolUse` (immediate feedback on file edits) and `Stop` (a safety net that catches edits made through shell commands).

The hook configuration is harness-specific; the script and the principle are not. Any harness with post-edit hooks can run `npm run knowledge:check` under the same conditions. Contributors without a hooked harness lose nothing: CI still rejects what the hook would have caught, just later.

## Minimal Adoption

You can adopt the two highest-value pieces without the rest, today:

- a `decisions/index.yaml` that maps topics to active Decision Records, and
- the Precedence section in your `AGENTS.md`.

That already gives an agent what most repositories lack: which decisions are in force, and which source wins on conflict.

## In the field

The first production adoption was a multi-tenant marketplace, four months into development, built largely by coding agents. The method arrived mid-project. Some of what happened:

- **A rules snapshot rotted in six days.** Before the method had a backfill path, agents reconstructed the business rules into a standalone document. Within a week it contradicted an accepted decision and the code, and its line-number citations had drifted. That failure is why backfill writes into the catalog, rule by rule, and never into a report.
- **Diffing knowledge against code caught a wrong decision.** An *accepted* Decision Record turned out to describe behavior the code did not have. Because the decision was a canonical, indexed record, the contradiction was detectable, and it was fixed through the normal draft-and-promote flow instead of surfacing as a production bug.
- **One backfilled domain paid for itself.** Auditing a single domain — login, sessions, user management, about fifty files — recovered 22 behavior rules into three feature specs, each rule with its evidence and, where one exists, the test that proves it. The same pass reported two accepted decisions that were never implemented, one decision the code had outgrown, and three defects, two of them security issues. Nobody had asked about any of them.

## Distribution Roadmap

Copying files is the V1 adoption path on purpose: it keeps your knowledge and its validator versioned inside the repository they govern, which is where CI needs them. Two distribution improvements are candidates once the method stabilizes against a real product:

- an npm package with a `kde` binary so the validator updates as a dependency bump instead of a copy (proposed in KDE-RFC-010; `install.sh --upgrade` is the bridge until it is decided), and
- an agent skill that scaffolds the tree and teaches the retrieval rules to coding agents.

Both would complement the scaffold, not replace it: canonical knowledge always lives in the adopting repository.
