# selectors.py

Selectors are **read-only query helpers**.

They centralize org-scoping rules so views stay thin and consistent.

## Functions

- `buildings_qs_for_org(org)`  
  Returns Buildings filtered by `organization=org`

- `units_qs_for_org(org)`  
  Returns Units filtered by `organization=org` (often `select_related("building")`)

- `building_units_qs_for_org(org, building_id)`  
  Returns Units filtered by both org + building id

## Why selectors?

- Prevent drift: every list/detail query uses the same org-scoped pattern
- Improve testability: you can unit-test query behavior separately from views
