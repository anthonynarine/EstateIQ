# Leases App — Documentation Bundle

Generated: 2026-02-18 00:02 UTC

This bundle documents the **Leases** domain app for **PortfolioOS / EstateIQ**.

## Scope

The Leases app connects people (Tenants) to real estate Units (from the Buildings app) using Leases.

Included:

- Domain overview + boundaries
- Data model + invariants
- API endpoints + examples
- Multi-tenant security rules
- Pagination + ordering behavior
- Admin behavior
- Tests + org isolation guarantees
- Suggested frontend integration contract

## Key Guarantees (Non‑Negotiable)

- **No org IDs accepted from clients**
- **All querysets are org-scoped** via `request.org`
- **Cross-tenant references are rejected** (e.g., Lease cannot reference a Unit from another org)
- **Minimal PII** stored for tenants (email/phone optional)
- **All endpoints require**:
  - `Authorization: Bearer <access>`
  - `X-Org-Slug: <org-slug>`

## App Location

- `backend/apps/leases/`

## Files in this bundle

- `OVERVIEW.md`
- `DATA_MODEL.md`
- `API.md`
- `SECURITY.md`
- `PAGINATION_ORDERING.md`
- `ADMIN.md`
- `TESTING.md`
- `FRONTEND_INTEGRATION.md`
