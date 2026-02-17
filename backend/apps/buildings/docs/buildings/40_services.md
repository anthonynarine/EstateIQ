# services.py

Services are **write-focused** domain functions.

They encapsulate create/update logic, keep views thin, and enforce invariants.

## Principles

- Views should orchestrate: auth → serializer → service → response
- Services enforce:
  - server-derived org ownership
  - tenant integrity for relationships
  - transactional safety when needed

## Typical functions

- `create_building(org, data)`
- `update_building(building, data)`
- `create_unit(org, data)` — validates Building belongs to org
- `update_unit(unit, data)` — blocks cross-tenant building reassignment

## Why this matters

As the domain grows (bulk unit creation, building import, etc.), services become the stable API
for business operations while views remain stable.
