# permissions.py

This module composes the shared permission:

- `shared.auth.permissions.IsOrgMember`

and optionally aliases it as:

- `IsBuildingOrgMember`

## Why an alias?

The alias keeps domain code readable:

- "buildings domain requires building org membership"

without duplicating logic.

## Rule

The Buildings domain does not own tenancy logic — it depends on the platform layer in `shared/auth`.
