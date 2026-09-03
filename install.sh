#!/usr/bin/env bash
# Installs Knowledge-Driven Engineering scaffolding into the current repository.
#
# Usage, from the root of your repository:
#   curl -fsSL https://raw.githubusercontent.com/emafriedrich/knowledge-driven-engineering/main/install.sh | bash -s -- <first-domain>
#
# From a local clone (offline / development):
#   KDE_SOURCE=/path/to/knowledge-driven-engineering bash install.sh <first-domain>
#
# Idempotent: existing files are never overwritten.
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="https://github.com/emafriedrich/knowledge-driven-engineering"
REF="${KDE_REF:-main}"

say()  { printf '%s\n' "$*"; }
add()  { say "  add   $1"; }
skip() { say "  skip  $1 (already exists)"; }

# --- Locate source files -----------------------------------------------------
CLEANUP=""
if [ -n "${KDE_SOURCE:-}" ]; then
  SRC="$KDE_SOURCE"
else
  TMP="$(mktemp -d)"
  CLEANUP="$TMP"
  say "Downloading ${REPO_URL}@${REF} ..."
  curl -fsSL "${REPO_URL}/archive/refs/heads/${REF}.tar.gz" | tar -xz -C "$TMP"
  SRC="$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -1)"
fi
trap '[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"' EXIT

say "Installing Knowledge-Driven Engineering into $(pwd)"

# --- Tools and templates -----------------------------------------------------
mkdir -p tools templates

for f in knowledge-check.mts knowledge-context.mts drift-gate.mts knowledge-hook.mts; do
  if [ -e "tools/$f" ]; then skip "tools/$f"; else cp "$SRC/tools/$f" "tools/$f"; add "tools/$f"; fi
done

for src in "$SRC"/templates/*.md; do
  base="$(basename "$src")"
  if [ -e "templates/$base" ]; then skip "templates/$base"; else cp "$src" "templates/$base"; add "templates/$base"; fi
done

# --- Knowledge tree ----------------------------------------------------------
mkdir -p knowledge

if [ -e knowledge/index.yaml ]; then
  skip knowledge/index.yaml
else
  if [ -n "$DOMAIN" ]; then
    cat > knowledge/index.yaml <<CATALOG
# Domain catalog for retrieval. Keep rationale inside canonical documents.
domains:
  ${DOMAIN}:
    path: knowledge/${DOMAIN}
    description: TODO describe this domain in one line.
    decision_index: knowledge/${DOMAIN}/decisions/index.yaml
    # code_paths: [src/]  # repository path prefixes this domain governs
CATALOG
  else
    cat > knowledge/index.yaml <<'CATALOG'
# Domain catalog for retrieval. Keep rationale inside canonical documents.
# Add your first domain:
#   my-domain:
#     path: knowledge/my-domain
#     description: One line.
#     decision_index: knowledge/my-domain/decisions/index.yaml
#     code_paths: [src/]
domains: {}
CATALOG
  fi
  add knowledge/index.yaml
fi

if [ -n "$DOMAIN" ] && [ ! -d "knowledge/$DOMAIN" ]; then
  mkdir -p "knowledge/$DOMAIN/decisions"
  cat > "knowledge/$DOMAIN/README.md" <<DOMREADME
# ${DOMAIN} Domain

TODO: describe what this domain covers.

## Retrieval Path

1. Read \`knowledge/index.yaml\` to confirm the domain.
2. Read this file for the domain map.
3. Read the current spec for the capability, if one exists.
4. Read active decisions from \`decisions/index.yaml\`.
5. Read implementation after intended behavior is clear.
DOMREADME
  cat > "knowledge/$DOMAIN/decisions/index.yaml" <<'DECIDX'
# Maps decision topics to the active Decision Record.
# Keep rationale in the referenced record, not in this file.
current: {}
DECIDX
  add "knowledge/$DOMAIN/ (README + decisions/index.yaml)"
fi

# --- package.json ------------------------------------------------------------
if [ ! -e package.json ]; then
  npm init -y >/dev/null
  # Safe only on a package.json we created; forcing ESM on an existing
  # CommonJS project would break it. Existing projects without type:module
  # just see a benign Node warning when the tools run.
  npm pkg set type=module >/dev/null
  add package.json
fi
if npm pkg set \
  'scripts.knowledge:check=node --experimental-strip-types tools/knowledge-check.mts' \
  'scripts.knowledge:context=node --experimental-strip-types tools/knowledge-context.mts' >/dev/null 2>&1; then
  say "  set   package.json scripts (knowledge:check, knowledge:context)"
else
  say "  WARN  could not set package.json scripts; add knowledge:check and knowledge:context manually"
fi

# --- CI ----------------------------------------------------------------------
mkdir -p .github/workflows
if [ -e .github/workflows/kde.yml ]; then
  skip .github/workflows/kde.yml
else
  cat > .github/workflows/kde.yml <<'WORKFLOW'
name: Knowledge

on:
  push:
    branches: [main]
  pull_request:

jobs:
  knowledge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable
      - run: |
          if [ -f pnpm-lock.yaml ] || [ -f pnpm-workspace.yaml ]; then pnpm install
          elif [ -f yarn.lock ]; then yarn install
          else npm ci || npm install
          fi
      - run: npm run knowledge:check
      - run: node --experimental-strip-types tools/knowledge-context.mts --check
      - name: Drift gate
        if: github.event_name == 'pull_request'
        env:
          PR_BODY: ${{ github.event.pull_request.body }}
          DRIFT_BASE_REF: origin/${{ github.base_ref }}
        run: node --experimental-strip-types tools/drift-gate.mts
WORKFLOW
  add .github/workflows/kde.yml
fi

# --- Claude Code hooks (optional layer; CI stays the hard guarantee) ---------
if [ -e .claude/settings.json ]; then
  # Merge the KDE hook entries into the existing settings without touching
  # anything else. Idempotent: skips if the hook command is already wired.
  if node -e '
    const fs = require("fs");
    const path = ".claude/settings.json";
    const settings = JSON.parse(fs.readFileSync(path, "utf8"));
    const command = "node --experimental-strip-types tools/knowledge-hook.mts";
    settings.hooks ??= {};
    let changed = false;
    const ensure = (event, entry) => {
      settings.hooks[event] ??= [];
      if (JSON.stringify(settings.hooks[event]).includes(command)) return;
      settings.hooks[event].push(entry);
      changed = true;
    };
    ensure("PostToolUse", { matcher: "Edit|Write", hooks: [{ type: "command", command }] });
    ensure("Stop", { hooks: [{ type: "command", command }] });
    if (changed) fs.writeFileSync(path, JSON.stringify(settings, null, 2) + "\n");
    process.exit(changed ? 0 : 3);
  ' 2>/dev/null; then
    add ".claude/settings.json KDE hooks merged (Claude Code will ask you to approve them once)"
  else
    status=$?
    if [ "$status" -eq 3 ]; then
      skip ".claude/settings.json KDE hooks"
    else
      say "  WARN  could not merge hooks into .claude/settings.json; add them manually from ${REPO_URL}/blob/main/.claude/settings.json"
    fi
  fi
else
  mkdir -p .claude
  cp "$SRC/.claude/settings.json" .claude/settings.json
  add ".claude/settings.json (Claude Code will ask you to approve the hooks once)"
fi

# --- AGENTS.md ---------------------------------------------------------------
if [ -e AGENTS.md ] && grep -q 'kde:begin' AGENTS.md; then
  skip "AGENTS.md KDE section"
else
  cat >> AGENTS.md <<AGENTSBLOCK
<!-- kde:begin -->
## Knowledge-Driven Engineering

Canonical knowledge lives under \`knowledge/\`. Treat it as part of the system, not as commentary. Method reference: ${REPO_URL}

### Retrieval Order

1. Identify the affected domain in \`knowledge/index.yaml\`.
2. Read the domain README.
3. Read the current spec for the capability if one exists.
4. Read active decisions from the domain \`decisions/index.yaml\`.
5. Read other artifacts only when the task touches them.
6. Read implementation after you understand intended behavior.

Run \`npm run knowledge:context -- <file-or-domain>\` to generate the retrieval bundle, and include its output as the context receipt in your PR or task.

### Precedence

When sources disagree: active Decision Record > current Specification > other domain docs > implementation behavior > historical knowledge. Report conflicts instead of choosing silently.

### Hard Rules

- Do not invent product behavior.
- Declare \`drafted_by: agent\` on every knowledge document you draft.
- Never set a document you drafted to \`accepted\`, \`current\`, or \`implemented\`. Promotion is human-only.
- Create knowledge documents by copying the matching template in \`templates/\`.
- Run \`npm run knowledge:check\` after changing knowledge artifacts.
<!-- kde:end -->
AGENTSBLOCK
  add "AGENTS.md KDE section"
fi

# --- Dependency: yaml --------------------------------------------------------
# Last on purpose: the file copies above are the valuable, idempotent part and
# must not be lost to a package-manager failure. Never abort on this step.
PM="npm"
PM_CMD=(npm install --no-fund --no-audit --save yaml)
if [ -f pnpm-workspace.yaml ]; then
  PM="pnpm"; PM_CMD=(pnpm add -w yaml)
elif [ -f pnpm-lock.yaml ]; then
  PM="pnpm"; PM_CMD=(pnpm add yaml)
elif [ -f yarn.lock ]; then
  PM="yarn"; PM_CMD=(yarn add yaml)
elif [ -f bun.lock ] || [ -f bun.lockb ]; then
  PM="bun"; PM_CMD=(bun add yaml)
fi

if "${PM_CMD[@]}" >/dev/null 2>&1; then
  say "  dep   yaml (via ${PM})"
else
  say "  WARN  could not install the 'yaml' dependency (tried: ${PM_CMD[*]})."
  say "        Install it manually before running knowledge:check."
fi

# --- Done --------------------------------------------------------------------
say ""
say "Done. Next steps:"
say "  1. npm run knowledge:check"
say "  2. Seed current truth: copy templates/decision-record.md into knowledge/${DOMAIN:-<domain>}/decisions/,"
say "     record one decision your team already made, and list it in decisions/index.yaml."
say "  3. Enable branch protection with code-owner review so knowledge promotion needs a human."
say ""
say "Full guide: ${REPO_URL}/blob/main/ADOPTING.md"
