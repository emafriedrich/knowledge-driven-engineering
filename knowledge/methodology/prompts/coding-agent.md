---
id: KDE-PROMPT-001
title: Coding agent context template
status: current
created: 2026-08-30
updated: 2026-09-03
authors: [engineering]
scope: [methodology]
tags: [prompt, agents]
depends_on: [KDE-SPEC-001]
related: [KDE-FLOW-001]
---

# Coding Agent Context Template

Use this shape when preparing scoped agent context. Generate the canonical-knowledge block with `npm run knowledge:context -- <file-or-domain>` instead of assembling it by hand; paste its output as the context receipt.

```text
Task:
<bounded implementation task>

Domain:
<domain name from knowledge/index.yaml>

Canonical knowledge:
- Spec: <SPEC-ID or path>
- Active decisions: <DR-ID list from domain decisions/index.yaml>
- IA or flow: <IDs or paths, if product experience changes>
- Design system: <IDs or paths, if reusable UI rules apply>
- Engineering docs: <IDs or paths, if technical constraints apply>

Rules:
- Report conflicts between docs and implementation.
- Do not invent product behavior.
- Declare drafted_by: agent on knowledge documents you draft; never promote them.
- Update affected specs or decisions when behavior changes.
```

