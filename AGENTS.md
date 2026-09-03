# AGENTS.md

This repository uses Knowledge-Driven Engineering. Treat canonical knowledge as part of the system, not as commentary about the system.

## Method Map

This file is the only document loaded every session. Read the rest on demand, at these moments:

- `README.md`: what the method is and how knowledge flows. Read on first contact with the repository.
- `HANDBOOK.md`: artifact semantics and creation criteria. Read before creating or reclassifying a knowledge artifact.
- `CONTRIBUTING.md`: the change process. Read before changing methodology rules, templates, or the validator.
- `templates/`: canonical artifact shapes. Copy the matching template when creating any knowledge document.
- `ADOPTING.md`: only for setting the method up in another repository.

## Retrieval Order

1. Identify the affected domain, such as `methodology`, `storefront`, `checkout`, or `orders`.
2. Read `knowledge/index.yaml` to find the domain entry.
3. Read the domain `CONTEXT.md` when present: it is the generated map of current truth. Then the domain README.
4. Read the current spec for the capability if one exists.
5. Read active decisions from the domain `decisions/index.yaml`.
6. Read IA, User Flow, Design System, engineering, or prompt artifacts only when the task touches them.
7. Read implementation after you understand intended behavior.

Run `npm run knowledge:context -- <file-or-domain>` to generate the retrieval bundle for a code path or domain, and include its output as the context receipt in your PR or task.

Do not read the whole `knowledge/` tree by default.

## Precedence

Use this order when sources disagree:

1. Active Decision Record listed in the relevant domain decision index.
2. Current Specification that does not contradict an active decision.
3. Domain IA, User Flow, Design System, or engineering playbook.
4. Implementation behavior.
5. Historical knowledge.

A spec cannot override an active Decision Record. Implementation may lag behind a new spec. Report conflicts instead of choosing silently.

## Dependencies

Treat `depends_on` as a review signal. If you change or supersede a document, search for documents that depend on it and update or flag them.

Use `related` only as background context.

## Superseded Decisions

Treat `status: superseded` Decision Records as historical evidence. If a record has `superseded_by`, read the replacement before acting.

## Knowledge Changes

Create an RFC when a change is significant, uncertain, cross-domain, or requires product/design/engineering discussion.

Create a Decision Record when the team makes an important product, UX, design, architecture, security, infrastructure, or business decision.

Update an existing spec when intended behavior changes and the decision context already exists.

Create or update a task only after the canonical knowledge that justifies it exists.

## Hard Rules

- Do not invent product behavior.
- Declare `drafted_by: agent` on every knowledge document you draft.
- Never set a document you drafted to `accepted`, `current`, or `implemented`. Promotion is human-only.
- Do not treat existing implementation as current truth when canonical knowledge says otherwise.
- Report conflicts between code and knowledge before changing behavior.
- Keep prompts short and reference canonical IDs or paths.
- Create knowledge documents by copying the matching template in `templates/`.
- After changing knowledge artifacts, run `npm run knowledge:check` and refresh manifests with `npm run knowledge:context -- --write`.

