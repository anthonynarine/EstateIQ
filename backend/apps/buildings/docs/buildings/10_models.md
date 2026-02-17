# models.py

Defines the core database models:

- `Building`
- `Unit`

## Why these models exist

- Buildings and Units define the portfolio structure.
- All future financial events (ledger) can be anchored to a Unit and rolled up to Building/Org.

## Multi-tenant rules enforced at the model layer

### Building

- Has `organization = ForeignKey(Organization)`
- Unique constraint: building `name` unique per org (optional but helpful)
- Indexed by `(organization, created_at)` and `(organization, name)` for common access patterns

### Unit

- Has `organization = ForeignKey(Organization)`
- Has `building = ForeignKey(Building)`
- **Tenant integrity**: `unit.organization` must match `unit.building.organization`

This is enforced in:

- `clean()` — validates org match
- `save()` — calls `full_clean()` to ensure validation runs everywhere (admin, scripts, services)

## Pitfalls avoided

- Cross-tenant linking of Unit → Building
- Accidentally trusting client-provided org identifiers
