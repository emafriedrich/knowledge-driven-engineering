# Contributing

This repository describes a methodology, so changes should preserve traceability without adding ceremony.

## Direct Changes

Use a direct pull request for:

- typo fixes,
- broken link fixes,
- small template wording improvements,
- validator bug fixes that do not change methodology semantics.

## RFC Required

Use an RFC for:

- new artifact types,
- lifecycle changes,
- metadata changes,
- precedence rule changes,
- domain index changes,
- changes that affect how agents retrieve canonical knowledge.

Use a Decision Record when maintainers accept a methodology change that future contributors will need to understand.

## Dependency Review

If you change or supersede a canonical document, search for documents that list it in `depends_on`.

Review affected specs, flows, IA, design-system docs, prompts, templates, and examples. Update them in the same change when the meaning changes.

## Checklist

- Keep the artifact set small.
- Explain which engineering mistake the change prevents.
- Avoid duplicating rationale across files.
- Update templates when metadata or artifact semantics change.
- Update examples when a reader would otherwise learn the old pattern.
- Bump `version` in `package.json` (`npm version patch --no-git-tag-version`) whenever you change a file the installer copies into adopting repositories — anything under `tools/`, `install.sh`, or `.claude/settings.json`. Adopters learn a fix exists through the version marker, so an unbumped fix is invisible to them; CI rejects the PR otherwise (DR-011).
- Run `npm run knowledge:check`.

