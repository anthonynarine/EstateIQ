# Tenancy + Leases Frontend (Vertical Slice) — Docs

Date: 2026-02-19

This documentation covers the **Tenants + Leases** frontend vertical slice implemented in the EstateIQ / PortfolioOS frontend.

## What this slice delivers

### Tenants
- Tenants list (paginated)
- Ordering support (e.g. `full_name`, `-created_at`)
- Create tenant modal (MVP)

### Leases (Unit-scoped)
- List leases for a unit (via `/api/v1/units/:unitId/leases/`)
- Create lease modal (MVP)
  - selects **one** tenant as **primary**
  - fields: `unit`, `start_date`, `rent_amount`, `status`, `rent_due_day`, `security_deposit_amount`
- Shows `parties_detail` in the leases table

### Multi-tenant hardening
All requests require:
- `Authorization: Bearer <access>`
- `X-Org-Slug: <orgSlug>` (set by OrgProvider + axios interceptor)

## Key concepts

- **TanStack Query = server state**
  - Caching, deduplication, pagination smoothing
  - Query keys include `orgSlug` to prevent cross-org cache bleed
- **Providers handle app-wide concerns**
  - AuthProvider: token lifecycle + refresh
  - OrgProvider: selected org slug
  - QueryProvider: TanStack QueryClient

## Where to start

1. Read: `DOCS_ARCHITECTURE.md`
2. Read: `DOCS_API_CONTRACTS.md`
3. Read: `DOCS_DATAFLOW.md`
4. Read: `DOCS_TROUBLESHOOTING.md`

## File map (expected)

See `DOCS_FILE_MAP.md` for the canonical list of files in this slice.
