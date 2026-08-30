# Decisions

This directory stores proposal and decision history.

## Contents

- `rfcs/` contains proposals and discussion artifacts.
- `records/` contains Decision Records.
- `index.yaml` maps current decision topics to active Decision Records.

## Current Decision Lookup

Use `index.yaml` when you need the active decision for a topic. Read the referenced Decision Record for rationale.

Decision Records are historical evidence. The index is the current projection.

## Supersession Example

`DR-001` originally accepted the `ADR` name. `DR-004` later superseded it and chose `Decision Record` as the canonical name.

An agent can determine the current rule without scanning every record:

1. Read `knowledge/decisions/index.yaml`.
2. Find `methodology.decision-record-naming: DR-004`.
3. Read `DR-004` for the current decision and rationale.
4. Treat `DR-001` as historical context because it has `status: superseded` and `superseded_by: [DR-004]`.
