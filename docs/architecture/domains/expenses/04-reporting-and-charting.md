# Expense Reporting and Charting

Reporting deserves its own API surface.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant URL as Router
    participant VIEW as ExpenseReportingViewSet
    participant MIXIN as Org Scoped Mixin
    participant SEL as Reporting Selectors
    participant SVC as Reporting Service
    participant SER as Reporting Serializer
    participant DB as Database

    FE->>URL: GET /api/v1/expense-reporting/dashboard/
    URL->>VIEW: route request
    VIEW->>MIXIN: resolve org + filters
    VIEW->>SEL: monthly trend / by category / by building
    SEL->>DB: aggregate org-scoped expense data
    DB-->>SEL: grouped totals
    VIEW->>SVC: assemble dashboard payload
    SVC-->>VIEW: composed dashboard object
    VIEW->>SER: chart-friendly JSON
    VIEW-->>FE: dashboard response
```

## Reporting targets

- monthly trend
- spend by category
- spend by building
- dashboard cards

## Contract philosophy

- Selectors own deterministic aggregates.
- Serializers own frontend-friendly shapes.
- Services compose combined payloads only when necessary.
