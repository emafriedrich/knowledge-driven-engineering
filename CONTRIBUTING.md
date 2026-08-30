# Contributing

This repository describes a methodology, so changes to the methodology should preserve traceability.

## Change Types

Use a direct pull request for:

- typo fixes,
- broken link fixes,
- small template wording improvements,
- validator bug fixes that do not change methodology semantics.

Use an RFC for:

- new artifact types,
- lifecycle changes,
- metadata changes,
- precedence rule changes,
- decision-index convention changes,
- changes that affect how agents consume knowledge.

Use a Decision Record when maintainers accept a methodology change that future contributors will need to understand.

## Contribution Checklist

- Keep the artifact set small.
- Explain which problem the change solves.
- Avoid duplicating rationale across files.
- Update templates when methodology semantics change.
- Update examples when a reader would otherwise learn the old pattern.
- Run `npm run knowledge:check`.

## Validation

V0 validation is intentionally small. It checks metadata, references, supersession links, and decision-index targets. Add checks when real use reveals repeated mistakes.

