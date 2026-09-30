---
id: MP-DR-035
title: A deactivated business can be reactivated and comes back closed and unlisted
status: accepted
created: 2026-09-24
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [decision]
depends_on: [MP-DR-030]
related: [MP-DR-023, MP-DR-034, MP-DR-036]
supersedes: []
superseded_by: []
---

# MP-DR-035: A deactivated business can be reactivated and comes back closed and unlisted

## Context

`PATCH /admin/saas/businesses/:business_id/deactivate` sets `isActive`,
`isOpen` and `isStorefrontPublished` to `false` together. Until 2026-09-24
there was no way back: the repository supported flipping `isActive`, but no
action or route exposed it, so a business deactivated by mistake (or one that
paid a late invoice) could only be fixed by hand in the database.
`docs/sistema/businesses.md` recorded this in "Qué NO hace".

A reactivation action and route were added in the working tree on 2026-09-24
without a recorded decision. This record makes that behavior canonical.

**Revision note (2026-09-25):** MP-DR-030 rule 1 now makes `deactivatedAt`
(plus a required reason and optional note) the stored source of truth for
deactivation, with `isActive` derived as `deactivatedAt === null`. Rule 2
below was reworded accordingly; the behavior it describes is unchanged.

## Decision

1. **Only `saas_admin` reactivates**, via
   `PATCH /admin/saas/businesses/:business_id/activate` — the same console and
   access check as deactivation (`ensureSaasAccess`).
2. **Reactivation clears the deactivation and nothing else.** It sets
   `deactivatedAt`, the deactivation reason and its note back to null
   (MP-DR-030 rule 1) — that is what makes the business active again. The
   business comes back with `isOpen = false` and
   `isStorefrontPublished = false`. Nothing is restored automatically: the
   merchant reopens it (MP-DR-034 still requires the schedule too) and opting
   back into the marketplace listing is a separate step (MP-DR-030 rule 3).
3. **Reactivation does not reset the lifecycle.** A business that was `live`
   (MP-DR-036) stays `live`; its profile, schedule, catalog, users and order
   history are untouched. Deactivation never deletes data.
4. **It is audited.** The route records a `business_activated` event in
   `business_events`, mirroring `business_deactivated`. Since the business
   row no longer keeps the cleared reason or timestamp (MP-DR-030 rule 1),
   this event log is the only history of past deactivations.
5. **Errors carry stable codes** (MP-DR-023): `businesses.invalid_payload`
   (`3006`) for an empty id, `businesses.not_found` (`3007`).
6. **Reactivating an active business is a no-op success**, not an error.

## Consequences

- Admin: the business detail shows "Dar de baja negocio" or "Reactivar
  negocio" depending on the derived `isActive`
  (`saas-business-actions.tsx`).
- `docs/sistema/businesses.md`: the "No hay ruta para reactivar" bullet is
  obsolete and must be removed.
- Deactivation still has no test; add one alongside `activate-business`.
- Users of the business regain access on reactivation (MP-DR-030 rule 1 lockout
  ends).

## Supersession

None.
