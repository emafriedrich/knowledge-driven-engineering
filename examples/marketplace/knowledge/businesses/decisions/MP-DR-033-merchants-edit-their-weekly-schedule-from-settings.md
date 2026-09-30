---
id: MP-DR-033
title: Merchants edit their weekly schedule from settings
status: accepted
created: 2026-09-24
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: []
related: [MP-DR-023, MP-DR-030, MP-DR-034]
supersedes: []
superseded_by: []
---

# MP-DR-033: Merchants edit their weekly schedule from settings

## Context

`business_schedules` exists since migration `002_create_businesses_products.sql`
(one row per `business_id` + `day_of_week`, with `opens_at`, `closes_at`,
`is_open`), and the storefront already renders it ("cierra a las HH:MM"). But
no action, HTTP route or admin screen creates or edits it: the repository only
`SELECT`s the table and the only write in the repo is the seed script
(`docs/sistema/businesses.md`, "Horarios semanales ... sólo lectura"). Any real
business therefore shows whatever the seed wrote, or nothing. That breaks the
vision's honesty principle — the UI shows hours no merchant ever declared —
and blocks MP-DR-034, which makes the schedule decide whether orders are accepted.

The product owner decided on 2026-09-24 that the schedule must be editable by
the merchant, and on 2026-09-25 that split shifts (two or more ranges the same
day) are required before launch. Nothing is launched, so the table can change
freely.

## Decision

1. **The merchant owns the weekly schedule.** It is edited from the admin
   settings screen (`apps/admin/app/settings/`) through an API action in
   `apps/api/contexts/businesses/features/management/`, gated by the
   `business.configure` capability (MP-DR-004), checked in the API.
2. **The whole week is saved at once.** The action receives the seven days,
   each with its list of ranges (possibly empty), and replaces all of the
   business's rows in one transaction. There is no per-day endpoint.
3. **Each day has zero or more open ranges (split shifts).** A day with no
   ranges is closed all day. An open day has one or more ranges
   `opens_at`–`closes_at`, in `HH:MM` (minute precision) — e.g. 11:00–15:00
   and 20:00–00:00 the same day, which is common in Argentina and required
   before launch (product owner, 2026-09-25).
   - Storage is **one row per range**, not one row per day: the
     `UNIQUE (business_id, day_of_week)` constraint and the per-day
     `is_open` column are dropped. "Closed" is the absence of ranges, so
     there is no boolean to keep in sync with the ranges (same reasoning as
     MP-DR-030 point 1).
   - Ranges of the same day must not overlap or touch; they are stored and
     returned sorted by `opens_at`.
4. **Ranges may cross midnight.** `closes_at < opens_at` means the range ends
   the next day (e.g. Friday 20:00–02:00 covers Saturday 00:00–02:00 and
   belongs to Friday). Such a range must not overlap the next day's first
   range. `closes_at = opens_at` is rejected (ambiguous: closed or 24 h). A
   24-hour day is expressed as 00:00–23:59. Only the last range of a day may
   cross midnight.
5. **Validation errors carry stable codes** (MP-DR-023), in the
   `businesses.*` namespace: `businesses.schedule_invalid_day`,
   `businesses.schedule_invalid_time`, `businesses.schedule_empty_range`,
   `businesses.schedule_overlapping_ranges`.
6. **New businesses start with every day closed.** `create-business` writes
   no ranges, so a new business is closed all week and (under MP-DR-034) cannot
   take orders until the merchant sets its hours.
7. **Times are wall-clock time in the platform timezone**
   (`America/Argentina/Buenos_Aires`); see MP-DR-034 rule 3.

## Consequences

- New action (e.g. `update-business-schedule`) with params, errors, tests; new
  route under `business.routes.ts`; repository write method; schedule section
  in `apps/admin/app/settings/page.tsx`.
- Migration on `business_schedules`: drop `UNIQUE (business_id, day_of_week)`
  and `is_open`; every existing row becomes one range. No production data, so
  no backfill care (seeds are updated instead; some seed businesses should
  get split shifts so the case is exercised).
- Readers (`business-repository.ts`, `discovery-repository.ts`, the storefront
  "cierra a las HH:MM" copy) change from "one row per day" to "list of ranges
  per day". The availability function (MP-DR-034 / MP-SPEC-005) evaluates every
  range, including yesterday's midnight-crossing one.
- `create-business` inserts nothing for the schedule; the in-memory
  repository models the same.
- `docs/sistema/businesses.md` rule "Horarios semanales: sólo lectura" and the
  matching "Qué NO hace" bullet become obsolete once implemented.
- **Out of scope, needs a new decision:** holidays and one-off closures by
  date, per-business timezone.

## Supersession

None.
