# Reporting Composition

Reporting is downstream of the system’s truth domains.

```mermaid
flowchart LR
    PROP[Properties]
    LEASE[Leasing]
    BILL[Billing]
    EXP[Expenses]
    REP[Reporting]
    UI[Dashboards / Reports]

    PROP --> REP
    LEASE --> REP
    BILL --> REP
    EXP --> REP
    REP --> UI
```

## Design rule

Reporting should consume structured, deterministic facts.
It should not become the place where core domain truth is invented.
