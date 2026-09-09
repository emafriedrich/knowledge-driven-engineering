---
id: SPEC-NNN
title: <Title>
status: current
created: YYYY-MM-DD
updated: YYYY-MM-DD
authors: [<name-or-team>]
drafted_by: <human-or-agent>
scope: [<domain>]
tags: [spec]
depends_on: []
related: []
---

# SPEC-NNN: <Title>

<!-- Primary question: What behavior and constraints must the implementation satisfy? -->

## Scope

<!-- Define what the spec covers and what it excludes. -->

## Required Behavior

<!-- Use precise, testable requirements. -->

## Constraints

<!-- Capture performance, accessibility, security, compatibility, or data constraints. -->

## Acceptance Checks

<!-- List observable checks an implementation agent or reviewer can run. The
     `acceptance` fence below holds the commands that prove them — normally the
     project's own tests. `npm run knowledge -- accept <ID>` runs it, and the
     spec cannot become `implemented` unless it passes. -->

```acceptance
npm test -- --grep "<capability>"
```
