# 02 — API

Base prefix:

- `/api/v1/`

All requests require:

- `Authorization: Bearer <access>`
- `X-Org-Slug: <org-slug>`

## Tenants

### List Tenants

`GET /api/v1/tenants/`

- Paginated: returns `count/next/previous/results`

Example:

```bash
curl -H "Authorization: Bearer $ACCESS" -H "X-Org-Slug: org-a" \
  http://localhost:8000/api/v1/tenants/
```

### Create Tenant

`POST /api/v1/tenants/`

Body:

```json
{
  "full_name": "Jane Tenant",
  "email": "jane@example.com",
  "phone": "+1-555-555-5555"
}
```

Notes:

- Client never sends `organization`
- Server assigns tenant to `request.org`

### Retrieve/Update/Delete Tenant

- `GET /api/v1/tenants/:id/`
- `PATCH /api/v1/tenants/:id/`
- `DELETE /api/v1/tenants/:id/`

## Leases

### List Leases

`GET /api/v1/leases/`

Filters:

- `?unit=<unit_id>`
- `?status=draft|active|ended`

Ordering (if enabled):

- `?ordering=-created_at`
- `?ordering=start_date`

### Create Lease

`POST /api/v1/leases/`

Body:

```json
{
  "unit": 12,
  "start_date": "2026-02-01",
  "end_date": null,
  "rent_amount": "1500.00",
  "security_deposit_amount": "500.00",
  "rent_due_day": 1,
  "status": "active",
  "parties": [
    { "tenant_id": 7, "role": "primary" }
  ]
}
```

Validation:

- Unit must belong to `request.org`
- Tenant IDs in parties must belong to `request.org`

### Retrieve/Update/Delete Lease

- `GET /api/v1/leases/:id/`
- `PATCH /api/v1/leases/:id/`
- `DELETE /api/v1/leases/:id/`

### By Unit Convenience Endpoint

`GET /api/v1/leases/by-unit/<unit_id>/`

### Unit → Leases (from Buildings app)

`GET /api/v1/units/<unit_id>/leases/`

Returns leases (org-scoped) for that unit.
