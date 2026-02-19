# Backend API Contracts — Tenancy + Leases Slice

All requests require:
- `Authorization: Bearer <access>`
- `X-Org-Slug: <orgSlug>`

## Tenants
- `GET /api/v1/tenants/` (paginated) supports `ordering`
- `POST /api/v1/tenants/`
- `GET/PATCH/DELETE /api/v1/tenants/:id/`

## Leases
- `GET /api/v1/leases/` (paginated) supports `unit`, `status`, `ordering`
- `POST /api/v1/leases/` (write-only `parties`)
- `GET/PATCH/DELETE /api/v1/leases/:id/`
- `GET /api/v1/units/:id/leases/` (used by UnitLeasesPage)

Lease read includes:
- `parties_detail: [{ tenant: {...}, role }]`

## Units
- `GET /api/v1/units/` (paginated or non-paginated)
