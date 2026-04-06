# 04 — Scenarios and Data Shape

## Why scenarios are split

The scenario package is intentionally split by concern:

- `buildings.py`
- `tenants.py`
- `leases.py`
- `billing.py`
- `expenses.py`

This avoids a giant unreadable configuration file and keeps each data layer understandable.

## Current scenario philosophy

All data must be:
- deterministic
- readable
- believable
- easy to extend

## Stable codes matter

Scenarios use stable codes such as:
- `MAPLE-1A`
- `TENANT-JORDAN-ELLIS`
- `LEASE-RIVER-2B-2023`

Those codes are the internal reference system that lets builders connect records across domains safely.

## Lease scenario structure

Lease scenarios define:
- unit reference
- tenant reference
- start/end dates
- rent amount
- deposit amount
- due day
- status

## Billing scenario structure

Billing scenarios define behavior, not ledger rows.

Examples:
- current
- late_full
- partial_current
- delinquent
- historical_closed

This is important because the builder should interpret deterministic behavior patterns instead of hardcoding one-off record logic.

## Future expense scenario structure

The expense scenario layer should follow the same pattern:
- recurring org costs
- recurring building costs
- unit event costs
- lease-context costs
