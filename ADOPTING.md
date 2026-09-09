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
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- <your-first-domain>
```

`install.sh` performs the manual steps below, is idempotent, and never overwrites an existing file (it skips and tells you). It detects your package manager (npm, pnpm — workspaces included, yarn, bun) for the `yaml` dependency, and a dependency failure warns instead of aborting the install. Run it from the root of your repository; pass your first domain name as the argument. Offline installs work from a local clone: `KDE_SOURCE=/path/to/clone bash install.sh <domain>`. To pin a release instead of tracking `main`, set `KDE_REF=v0.1.0`.

## Upgrading

The installer classifies what it writes by owner (DR-011):

- **Framework-owned** — `tools/knowledge-check.mts`, `tools/knowledge-context.mts`, `tools/knowledge.mts`, `tools/drift-gate.mts`, `tools/knowledge-hook.mts`, `.github/workflows/kde.yml`, and the KDE hook entries in `.claude/settings.json`. Every copy carries a `kde-version: X.Y.Z` marker on its first line.
- **Adopter-owned** — everything under `knowledge/`, `templates/`, `AGENTS.md`, and your `package.json` beyond the two KDE scripts. Never touched, on any run. Templates are yours to shape to your team's conventions; the validator, not the template text, enforces KDE-SPEC-001.

Every run compares the installed markers with the fetched version and warns when a framework-owned file differs — whether from a newer release upstream or a local edit. To refresh them:

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- --upgrade
```

`--upgrade` replaces framework-owned files that differ and reports each one (`upgrade tools/knowledge-check.mts (0.1.0 -> 0.2.0)`). A framework-owned file you edited locally is overwritten too, with an explicit `WARN` line naming it. Framework-owned files are not an extension point: if you need different validation behaviour, fork this repository and install from your fork; if the change would help everyone, contributions are welcome. Adopter-owned files are not touched by `--upgrade`. New template files that a release adds (as `templates/model.md` and `templates/contract.md` were) arrive on a plain run, because the installer adds any file that does not exist yet.

## Manual Steps

1. **Create the knowledge tree.** `knowledge/index.yaml` with your first domain (a real product or system area — `storefront`, `payments`), plus that domain's `README.md` with its retrieval path.
2. **Copy `templates/`** from this repository. Fill templates by replacing placeholder values; the frontmatter must stay at the top of the file.
3. **Copy `tools/knowledge-check.mts`**, add the `yaml` dependency, and add the script to your `package.json`:

   ```json
   "scripts": { "knowledge:check": "node --experimental-strip-types tools/knowledge-check.mts" }
   ```

   Non-Node projects can run it with any Node >= 22.6 installed; the tool has one dependency.
4. **Wire CI.** Copy `.github/workflows/ci.yml` (or the equivalent in your CI) so every PR runs `knowledge:check`. Without CI the method is an honor system. Copy `tools/knowledge-context.mts` and `tools/drift-gate.mts` too, declare `code_paths` on your domains, and add a CODEOWNERS file plus branch protection so knowledge promotion requires owner approval.
5. **Add the agent rules.** Copy the Retrieval Order, Precedence, and Hard Rules sections of this repository's `AGENTS.md` into your project's `AGENTS.md` or `CLAUDE.md`, adjusting domain names.
6. **Seed current truth.** Write the first Decision Record for a decision your team already made, list it in the domain `decisions/index.yaml`, and anchor the domain in `knowledge/index.yaml`. One real decision beats ten empty folders.
7. **Grow on demand.** Add artifact folders (`specs/`, `flows/`, `rfcs/`) only when the domain has real content of that type, and new domains only when work needs a stable retrieval boundary.

## Lifecycle Commands

`npm run knowledge -- <command>` performs each lifecycle transition as one step and leaves the repository valid or explains why it refused:

```bash
npm run knowledge -- domain add orders --description "Order lifecycle" --code-paths src/orders/
npm run knowledge -- new decision orders "Orders are immutable after payment" --author <you>
npm run knowledge -- promote DR-001 --by <you>
npm run knowledge -- supersede DR-001 --by DR-002 --approved-by <you>
npm run knowledge -- renumber DR-002 DR-010
npm run knowledge -- done TASK-004
```

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

## Distribution Roadmap

Copying files is the V1 adoption path on purpose: it keeps your knowledge and its validator versioned inside the repository they govern, which is where CI needs them. Two distribution improvements are candidates once the method stabilizes against a real product:

- an npm package with a `kde` binary so the validator updates as a dependency bump instead of a copy (proposed in KDE-RFC-010; `install.sh --upgrade` is the bridge until it is decided), and
- an agent skill that scaffolds the tree and teaches the retrieval rules to coding agents.

Both would complement the scaffold, not replace it: canonical knowledge always lives in the adopting repository.
