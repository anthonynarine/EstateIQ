# Lease-Driven Occupancy

A unit is occupied when an active lease exists.

```mermaid
flowchart TD
    TODAY[Today]
    START[Lease.start_date]
    END[Lease.end_date]
    CHECK{start <= today and (end is null or end >= today)?}
    OCC[Occupied]
    VAC[Vacant]

    TODAY --> CHECK
    START --> CHECK
    END --> CHECK
    CHECK -->|Yes| OCC
    CHECK -->|No| VAC
```

## Rule

Avoid an `is_occupied` flag as authoritative truth.
Occupancy should be derived from lease dates so the system remains deterministic.
