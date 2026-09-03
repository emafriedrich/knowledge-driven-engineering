# Methodology Decisions

This directory stores Decision Records for Knowledge-Driven Engineering.

## Current Decision Lookup

Use `index.yaml` to find active methodology decisions. Read the referenced Decision Record for rationale.

Decision Records are history. The index is the current projection.

## Supersession Example

`DR-001` originally accepted the `ADR` name. `DR-004` later superseded it and chose `Decision Record` as the canonical name.

An agent can determine the current rule without scanning every record:

1. Read `knowledge/methodology/decisions/index.yaml`.
2. Find `decision-record-naming: DR-004`.
3. Read `DR-004` for the current decision and rationale.
4. Treat `DR-001` as historical context because it has `status: superseded` and `superseded_by: [DR-004]`.
