# serializers.py

Serializers define the API contract and enforce tenancy rules at the boundary.

## BuildingSerializer

- Exposes Building fields
- Does **not** expose `organization`
- Organization is always derived from `request.org` in the service/view layer

## UnitSerializer

- Exposes unit fields including `building` FK
- Does **not** expose `organization`
- Validates `building` belongs to `request.org` via `validate_building`

### Why validate_building?

Even if your queryset is org-scoped, a client could try to POST a `building_id` from another org.
The serializer blocks that before it reaches the DB.

## Common future extensions

- Read-only nested building label/name on unit list (via SerializerMethodField)
- Write-only `building_id` field for cleaner client payloads
