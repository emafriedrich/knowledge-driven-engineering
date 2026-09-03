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
+-- tools/knowledge-check.ts   <- copied from this repo
+-- .github/workflows/ci.yml   <- runs the validator
```

What you do **not** copy: HANDBOOK.md, the `methodology` domain, `examples/`, `tests/`. Those define and exercise the method itself; link to them instead of vendoring them.

## One-Command Install

```bash
curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- <your-first-domain>
```

`install.sh` performs the manual steps below, is idempotent, and never overwrites an existing file (it skips and tells you). Run it from the root of your repository; pass your first domain name as the argument. Offline or pinned installs work from a local clone: `KDE_SOURCE=/path/to/clone bash install.sh <domain>`.

## Manual Steps

1. **Create the knowledge tree.** `knowledge/index.yaml` with your first domain (a real product or system area — `storefront`, `payments`), plus that domain's `README.md` with its retrieval path.
2. **Copy `templates/`** from this repository. Fill templates by replacing placeholder values; the frontmatter must stay at the top of the file.
3. **Copy `tools/knowledge-check.ts`**, add the `yaml` dependency, and add the script to your `package.json`:

   ```json
   "scripts": { "knowledge:check": "node --experimental-strip-types tools/knowledge-check.ts" }
   ```

   Non-Node projects can run it with any Node >= 22.6 installed; the tool has one dependency.
4. **Wire CI.** Copy `.github/workflows/ci.yml` (or the equivalent in your CI) so every PR runs `knowledge:check`. Without CI the method is an honor system. Copy `tools/knowledge-context.ts` and `tools/drift-gate.ts` too, declare `code_paths` on your domains, and add a CODEOWNERS file plus branch protection so knowledge promotion requires owner approval.
5. **Add the agent rules.** Copy the Retrieval Order, Precedence, and Hard Rules sections of this repository's `AGENTS.md` into your project's `AGENTS.md` or `CLAUDE.md`, adjusting domain names.
6. **Seed current truth.** Write the first Decision Record for a decision your team already made, list it in the domain `decisions/index.yaml`, and anchor the domain in `knowledge/index.yaml`. One real decision beats ten empty folders.
7. **Grow on demand.** Add artifact folders (`specs/`, `flows/`, `rfcs/`) only when the domain has real content of that type, and new domains only when work needs a stable retrieval boundary.

## Harness Enforcement (Optional)

CI is the hard guarantee, but it fires at PR time. Coding-agent harnesses with lifecycle hooks can run the same validator **in-session**, so an agent sees an integrity error seconds after introducing it instead of after pushing. The rule of thumb: anything you can enforce with hooks, do not leave as prose.

This repository ships a working example for Claude Code:

- `tools/knowledge-hook.ts` reads the hook payload and runs the validator only when the touched file (or, on session stop, the pending working-tree changes) involves knowledge artifacts. It is silent on success, so the happy path costs no agent context, and it exits non-zero with the error list on failure, which the harness feeds back to the agent.
- `.claude/settings.json` wires it to `PostToolUse` (immediate feedback on file edits) and `Stop` (a safety net that catches edits made through shell commands).

The hook configuration is harness-specific; the script and the principle are not. Any harness with post-edit hooks can run `npm run knowledge:check` under the same conditions. Contributors without a hooked harness lose nothing: CI still rejects what the hook would have caught, just later.

## Minimal Adoption

You can adopt the two highest-value pieces without the rest, today:

- a `decisions/index.yaml` that maps topics to active Decision Records, and
- the Precedence section in your `AGENTS.md`.

That already gives an agent what most repositories lack: which decisions are in force, and which source wins on conflict.

## Distribution Roadmap

Copying files is the V1 adoption path on purpose: it keeps your knowledge and its validator versioned inside the repository they govern, which is where CI needs them. Two distribution improvements are candidates once the method stabilizes against a real product:

- an npm package (`npx kde-check`) so the validator updates without vendoring, and
- an agent skill that scaffolds the tree and teaches the retrieval rules to coding agents.

Both would complement the scaffold, not replace it: canonical knowledge always lives in the adopting repository.
