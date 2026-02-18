# 04 — Pagination & Ordering

## Pagination

DRF pagination is enabled via:

- `DEFAULT_PAGINATION_CLASS = shared.api.pagination.StandardResultsSetPagination`
- Default `page_size = 25`
- Client override: `?page_size=50` (bounded by `max_page_size=100`)

Response shape:

```json
{
  "count": 123,
  "next": "http://.../api/v1/tenants/?page=2",
  "previous": null,
  "results": [...]
}
```

## Ordering

Ordering is enabled per-ViewSet using `OrderingFilter` with curated fields only.

Typical usage:

- `GET /api/v1/tenants/?ordering=full_name`
- `GET /api/v1/leases/?ordering=-start_date`

Recommended order defaults:

- Tenants: `-created_at`
- Leases: `-created_at`
- Buildings/Units: `-created_at`

Avoid enabling ordering globally across all models to prevent accidental exposure
of internal fields.
