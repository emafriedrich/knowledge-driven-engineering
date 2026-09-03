# Knowledge

This directory stores canonical knowledge by domain.

A domain is a product area, system area, or methodology area where people perform work and need local context. Domain-first organization keeps retrieval close to the task.

## Entry Points

- `index.yaml` catalogs domains and current anchor artifacts.
- `<domain>/README.md` explains how to retrieve knowledge for that domain.
- `<domain>/decisions/index.yaml` maps active decision topics to current Decision Records.

## Artifact Folders

Create artifact folders inside a domain only when the domain has real content of that type:

- `rfcs/`
- `decisions/`
- `specs/`
- `flows/`
- `ia/`
- `design-system/`
- `prompts/`
- `tasks/`

Avoid global artifact folders for canonical project knowledge. They make retrieval start from document type instead of the work area.

