# AGENTS.md

This repository uses Knowledge-Driven Engineering. Code is not the only source of system knowledge.

## Discovery

Start with the narrowest context that matches the task:

1. Identify the affected product area, capability, component, or subsystem.
2. Read the current spec for that area.
3. Check `knowledge/decisions/index.yaml` for active Decision Records that apply.
4. Read domain docs that match the work, such as IA, User Flow, Design System, or engineering playbooks.
5. Read implementation after you understand intended behavior.

Do not load the whole `knowledge/` directory unless the task crosses many domains.

## Precedence

Use this order when sources disagree:

1. Active accepted or implemented Decision Record listed in the decision index.
2. Current Specification that does not contradict an active decision.
3. Domain-specific canonical documentation.
4. Implementation behavior.
5. Historical documentation.

A spec cannot override an active Decision Record. Implementation may lag behind a new accepted spec. Report conflicts instead of silently choosing one source and changing behavior.

## Superseded Decisions

Treat `status: superseded` Decision Records as historical evidence. Do not use them as current guidance unless a current document references them for context.

When a record has `superseded_by`, read the replacement before acting. When a record has `supersedes`, read the old record only if you need migration context or rationale history.

## Creating Or Updating Knowledge

Create an RFC when the change is significant, cross-cutting, uncertain, or requires product/design/engineering discussion.

Create a Decision Record when the team makes an important product, UX, design, architecture, security, infrastructure, or business-rule decision.

Update an existing spec when intended behavior changes and the decision context already exists.

Do not create a task as the source of product truth. Tasks should reference the accepted RFC, active Decision Record, or current spec that justifies the work.

## Agent Rules

- Do not silently invent product decisions.
- If canonical docs conflict with code, report the conflict and propose the smallest resolution path.
- If code reveals behavior missing from docs, add or request documentation before broadening the behavior.
- Keep prompts short and reference canonical IDs or paths.
- Run `npm run knowledge:check` after changing knowledge artifacts.

