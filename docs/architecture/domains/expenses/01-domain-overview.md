# Expenses Domain Overview

The expenses domain captures what the landlord spent and where that cost belongs.

```mermaid
flowchart LR
    FE[React Frontend]
    API[Django + DRF API]
    EXP[Expenses Domain]
    PROP[Properties]
    LEASE[Leasing]
    REP[Reporting]
    DB[(PostgreSQL)]
    OBJ[(Object Storage)]

    FE --> API
    API --> EXP
    EXP --> PROP
    EXP --> LEASE
    EXP --> REP
    EXP --> DB
    EXP --> OBJ
```

## Why this domain matters

Expenses explain:
- operating burden by building
- unit-specific repair history
- category trends
- future profitability analysis
