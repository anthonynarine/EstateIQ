# 07 — Frontend Integration

## Required Headers

Every request must include:

- `Authorization: Bearer <access>`
- `X-Org-Slug: <orgSlug>`

## Recommended UI Flows

### Tenants
- Tenants list (paginated)
- Add Tenant modal
- Tenant detail / edit

### Leases
- Lease create form:
  - select Unit (from Units list)
  - enter rent terms
  - attach parties (tenant picker)
- Lease list for Unit (unit detail page):
  - call `/api/v1/units/<id>/leases/`

## Client-side handling

- Expect paginated responses: use `data.results`
- Use `ordering` query params where needed
- Reuse your existing refresh queue to prevent refresh storms
