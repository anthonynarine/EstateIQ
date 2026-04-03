# Delinquency and Alerts

Delinquency is a derived operational signal, not a manually maintained status field.

```mermaid
flowchart TD
    CHARGES[Open Charges]
    ALLOCS[Allocations]
    ASOF[As-of Date]
    AGING{Days past due}
    CUR[Current]
    A30[1-30]
    A60[31-60]
    A90[61-90]
    A90P[90+]

    CHARGES --> AGING
    ALLOCS --> AGING
    ASOF --> AGING
    AGING --> CUR
    AGING --> A30
    AGING --> A60
    AGING --> A90
    AGING --> A90P
```

## Internal alert candidates

- missing expected monthly charge
- due soon
- overdue
- partially paid overdue
- unallocated cash
- lease with persistent delinquency

## Why this matters

Delinquency should be explainable from:

- posted charges
- allocations
- the selected as-of date

That keeps the signal trustworthy and lets later AI explanations stay grounded in real financial facts.

## Frontend implication

The system can later expose:

- delinquency report pages
- billing workbench queues
- alert cards
- lease-level delinquency badges
- “why this lease is delinquent” explanations
