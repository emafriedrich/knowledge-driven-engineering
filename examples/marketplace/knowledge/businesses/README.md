# businesses Domain

Covers the merchant as an entity: profile (name, description, images,
contact), location (address, coordinates), weekly schedules and open state,
delivery fee and minimum order, activation and storefront publication flags,
friendly business codes, and merchant settings management.

Does not cover the merchant's catalog (products), staff and permissions
(users), or platform-level SaaS metrics.

## Code Map

| Area | Path |
| --- | --- |
| Management (create, deactivate, settings, publication) | `apps/api/contexts/businesses/features/management/` |
| Public reads (list, get by slug) | `apps/api/contexts/businesses/features/storefront/` |
| Merchant settings UI | `apps/admin/app/settings/` |
| Schema | `apps/api/infra/db/migrations/002, 009, 014` |

