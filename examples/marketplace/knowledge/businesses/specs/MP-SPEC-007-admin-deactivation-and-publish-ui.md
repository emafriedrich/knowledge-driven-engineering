---
id: MP-SPEC-007
title: Admin UI for business deactivation and marketplace publishing (frontend)
status: current
created: 2026-09-25
updated: 2026-09-25
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [businesses]
tags: [spec]
depends_on: [MP-DR-030, MP-DR-035, MP-SPEC-004]
related: []
---

# MP-SPEC-007: Admin UI for business deactivation and marketplace publishing (frontend)

<!-- Primary question: What behavior and constraints must the implementation satisfy? -->

## Scope

The `apps/admin` screens for the backend in MP-SPEC-004:

- `saas_admin`: deactivate with a reason, see why and since when a business
  is deactivated, reactivate.
- Merchant (business `admin` role): publish or unpublish their business in
  the marketplace.

Out of scope: storefront screens (MP-SPEC-006); the merchant's manual open/closed
switch, which already exists and is unchanged.

## Required Behavior

### saas_admin — business detail (`saas-admin/businesses/[businessId]`)

1. "Dar de baja negocio" (`saas-business-actions.tsx`) opens a confirmation
   form that **requires** a reason, chosen from the MP-SPEC-004 categories, with
   Spanish labels:
   - `non_payment` → "Falta de pago"
   - `terms_violation` → "Incumplimiento de términos"
   - `business_requested` → "Pedido del negocio"
   - `other` → "Otro"

   It also has an optional free-text note. Submit is disabled until a reason
   is chosen.
2. A deactivated business's detail page shows a clear status block:
   "Dado de baja el <fecha>" plus the reason label and the note if present.
   It shows "Reactivar negocio" instead of "Dar de baja negocio".
3. The confirmation for reactivation states that the business comes back
   closed and not published in the marketplace (MP-DR-035), so the admin isn't
   surprised.
4. The business list (`saas-admin/businesses`) shows deactivated businesses
   distinctly (a "Dado de baja" badge with the reason on hover or as
   secondary text) and can be filtered by active / deactivated.
5. Which business is active is always read from the derived `isActive` or
   `deactivatedAt` returned by the API, never from a separately stored flag.

### Merchant — settings (`settings`)

6. A business `admin` sees a "Publicar en el marketplace" toggle. The helper
   text explains that when it's on the business appears in the city's
   listing and new customers who come from there are charged a commission
   (MP-DR-008 / MP-DR-030 point 4), and that when it's off the business keeps
   working through its own direct link.
7. Other roles see the current state but can't change it.
8. The merchant UI never shows `deactivatedAt`, the reason or the note
   (internal-only).

### Errors

9. API errors are shown through the shared error-copy map per MP-SPEC-003
   (`packages/web-shared/src/lib/error-copy.ts`); raw codes are never shown.

## Constraints

- Reason labels live in one place in the admin app and map 1:1 to the
  backend categories; an unknown category from a newer backend renders its
  raw value, never breaks the page.
- Dates are shown in Spanish, e.g. "25 de septiembre de 2026".

## Acceptance Checks

- As `saas_admin`, deactivating without choosing a reason is impossible;
  with "Falta de pago" and a note, the detail then shows "Dado de baja el …",
  "Falta de pago" and the note.
- Reactivating clears the status block and shows "Dar de baja negocio"
  again; the business shows as closed and unpublished.
- The business list filter "Dados de baja" shows only deactivated
  businesses.
- As a business `admin`, toggling "Publicar en el marketplace" updates
  `isStorefrontPublished`; as a non-admin role the toggle is read-only.
- No merchant screen or merchant API response contains the deactivation
  reason, note or date.
