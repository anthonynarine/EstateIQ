# admin.py

Registers Building and Unit models in Django admin.

## Goals

- Keep admin usable for ops/manual inspection
- Provide quick filtering by org/building
- Provide search across core identity fields (name, address, unit label)

## Notes

Admin is not a replacement for the API — it is an internal tool.
Tenant isolation in admin is not enforced by default unless you add custom admin querysets,
but since admin access is privileged, this is acceptable for MVP.

If you want tenant-aware admin later:
- override `get_queryset` to filter by admin user's org memberships
- or provide separate admin sites per tenant (rare)
