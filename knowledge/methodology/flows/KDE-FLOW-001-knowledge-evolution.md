---
id: KDE-FLOW-001
title: Knowledge evolution lifecycle
status: current
created: 2026-08-30
updated: 2026-08-30
authors: [engineering]
scope: [methodology]
tags: [flow, lifecycle]
depends_on: [DR-002]
related: [KDE-SPEC-001]
---

# Knowledge Evolution Lifecycle

## Flow

```mermaid
flowchart TD
    Idea[Idea] --> RFC[RFC]
    RFC --> Review[Review]
    Review --> Accepted{Accepted?}
    Accepted -->|No| Rejected[Rejected or archived RFC]
    Accepted -->|Yes| Decision[Decision Record]
    Decision --> Spec[Specification]
    Spec --> Implementation[Implementation]
    Implementation --> Validation[Validation]
    Validation --> Learning[Operational learning]
    Learning --> ChangeNeeded{Change needed?}
    ChangeNeeded -->|No| Current[Keep current knowledge]
    ChangeNeeded -->|Yes| NewRFC[New RFC]
    NewRFC --> Review
```

## Notes

Operational learning can update a spec, create a playbook, or trigger a new RFC. Use a new RFC when the learning changes product behavior, cross-domain contracts, or a prior decision.

