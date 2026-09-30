# Marketplace Example (Field Excerpt)

Unlike the [food-delivery example](../food-delivery/README.md), this one is not fictional. It is the `businesses` domain of the first production adoption of KDE: a multi-tenant food-ordering marketplace, where KDE arrived four months into development. It is copied as it stood on 2026-09-29.

Start at [knowledge/index.yaml](knowledge/index.yaml), then enter the [businesses domain](knowledge/businesses/README.md) and its generated [CONTEXT.md](knowledge/businesses/CONTEXT.md).

## What to look at

- **Current truth, computed.** [decisions/index.yaml](knowledge/businesses/decisions/index.yaml) maps ten topics to their active Decision Records. The pending section in `CONTEXT.md` keeps the two drafts out of current truth.
- **Agents propose; a human promotes.** Every record has `drafted_by: agent`. The accepted ones name the human who approved them in `approved_by`. The drafts (`MP-DR-053`, `MP-RFC-005`) have no approver yet.
- **Decisions that build on each other.** `MP-DR-034` (orders only while open) depends on `MP-DR-033` (weekly schedule). `MP-DR-035` and `MP-DR-036` build on the visibility states of `MP-DR-030`. The specs `MP-SPEC-004` and `MP-SPEC-007` turn those decisions into implementation-ready behavior.
- **An RFC that became a decision.** [MP-RFC-003](knowledge/businesses/rfcs/MP-RFC-003-business-friendly-code-generate-on-create-editable-after.md) (accepted) led to [MP-DR-046](knowledge/businesses/decisions/MP-DR-046-business-friendly-code-generated-on-create-editable-only-bef.md).
- **Brownfield onboarding.** [MP-DR-053](knowledge/businesses/decisions/MP-DR-053-backfill-baseline-for-businesses.md) is the backfill baseline, drafted when a backfill session started on this domain.

## What changed from the original

The records are unedited except for these changes, which let the excerpt stand alone and pass `npm run knowledge:check`:

- IDs carry an `MP-` prefix (`DR-034` → `MP-DR-034`) so they do not collide with this repository's own records. The prefix applies in file names, frontmatter and body text.
- Frontmatter references (`depends_on`, `related`, …) and `scope` values that point outside this domain were removed, because the validator rejects targets that do not exist. Body text still cites them, for example `MP-DR-008` or `MP-SPEC-005`, which live in domains not included here.
- The product's name and city were removed.
- `CONTEXT.md` was regenerated for the new paths.
- `knowledge/index.yaml` declares the two current specs under `current`, so the generated `CONTEXT.md` lists them as current truth. The original catalog had not been updated after the specs were promoted.
- Not a change, but worth knowing: `MP-DR-034` carries a "Revision note: edited in place after acceptance". That happened before launch, while the record was days old and its dependents were still being written. The method says decisions are superseded, never rewritten; in a project in production the same change would have been a new record promoted with `knowledge supersede`, leaving the original as history.

The application code is not included. The paths in the domain README's code map and the `file:line` citations in the records point to the private codebase.
