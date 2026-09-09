---
id: FD-CONTRACT-001
title: Storefront discovery API
status: draft
created: 2026-09-08
updated: 2026-09-08
authors: [engineering]
drafted_by: agent
approved_by: []
scope: [storefront]
tags: [contract, discovery]
depends_on: [FD-SPEC-001]
implements: []
related: [FD-MODEL-001]
---

# Contract: Storefront Discovery API

## Scope

The HTTP interface the storefront client uses to render category-first discovery (FD-SPEC-001). Behavior rules live in the spec; this contract only fixes the shapes a client may rely on. In a real repository `implements` would point at the route files, so a change there obliges a change here.

## Interface

| Method | Path | Response |
| --- | --- | --- |
| GET | `/storefront/categories` | `{ categories: [{ id, name, slug }] }` — ordered as they must render |
| GET | `/storefront/restaurants?category=<slug>` | `{ restaurants: [{ id, slug, name, isOpen }] }` — omit `category` for the unfiltered list |

Both responses are wrapped in the standard envelope `{ status: "ok", data }`.

## Errors

| Situation | HTTP | Body |
| --- | --- | --- |
| Unknown category slug | 404 | `{ status: "fail", code: 3001, message }` |
| Categories temporarily unavailable | 503 | `{ status: "fail", code: 3002, message }` — the client must still render restaurants (FD-SPEC-001) |

## Compatibility

Adding fields to a response is not a breaking change. Removing or renaming a field, or changing a status code, is a breaking change and requires a new contract version and a spec review.
