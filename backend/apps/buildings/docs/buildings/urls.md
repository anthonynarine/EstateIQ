# urls.py

Defines router wiring for the domain endpoints.

## Endpoints

- `/api/v1/buildings/` — CRUD
- `/api/v1/units/` — CRUD
- `/api/v1/buildings/{id}/units/` — list units for a building (nice-to-have)

## Project-level include

In `config/urls.py`, include:

- `path("api/v1/", include("apps.buildings.urls"))`

This keeps domain routing clean and versioned under a consistent API prefix.
