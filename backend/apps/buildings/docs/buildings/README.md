# Buildings Domain Documentation

Generated: 2026-02-17

This folder documents the **Buildings** domain app for PortfolioOS/EstateIQ.

## Domain goals

- Represent the physical portfolio structure: **Buildings** and **Units**
- Enforce strict **multi-tenant isolation** via `request.org` (derived from `X-Org-Slug`)
- Provide org-scoped CRUD APIs under `/api/v1/`

## Modules

- `models.py` — database models, constraints, tenant integrity
- `serializers.py` — DRF serializers; prevents client-supplied org IDs
- `selectors.py` — org-scoped queryset helpers
- `services.py` — business logic for create/update; validates tenant integrity
- `permissions.py` — permission alias that composes shared `IsOrgMember`
- `views.py` — thin ViewSets; always filter by `request.org`
- `urls.py` — router wiring for `/api/v1/buildings/` and `/api/v1/units/`
- `admin.py` — Django admin registrations
- `tests/test_org_isolation.py` — cross-tenant isolation tests

## Multi-tenancy invariants (non-negotiable)

1. **Server derives organization** from `request.org`.
2. **Client never sends org ids** to create/update.
3. **All querysets are org-scoped**: `filter(organization=request.org)`.
4. **Units cannot be linked** to a Building in a different org.
5. Cross-tenant resource access returns **404** (no existence leaks).
