# views.py

Views are implemented as DRF ViewSets and should remain **thin**.

## BuildingViewSet

- `get_queryset()` must return org-scoped queryset from selectors
- `perform_create()` uses services and forces `organization=request.org`
- `perform_update()` uses services
- Optional action: `GET /api/v1/buildings/{id}/units/`

### Existence leak protection

Because queryset is org-scoped, `retrieve()` naturally returns **404** for cross-tenant ids.

## UnitViewSet

- `get_queryset()` is org-scoped
- serializer context includes `request` for `validate_building`
- create/update uses services to enforce invariants

## Common future enhancements

- pagination
- search/order backends
- soft deletes
- audit/event log emission for AI insights layer
