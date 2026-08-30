# Coding Agent Context Template

Use this shape when preparing scoped agent context.

```text
Task:
<bounded implementation task>

Canonical knowledge:
- Spec: <SPEC-ID or path>
- Active decisions: <DR-ID list from knowledge/decisions/index.yaml>
- Design docs: <paths, if UI work>
- Engineering docs: <paths, if technical constraints apply>

Rules:
- Report conflicts between docs and implementation.
- Do not invent product behavior.
- Update affected specs or decisions when behavior changes.
```

