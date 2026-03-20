# EstateIQ / PortfolioOS Diagram Library

This package contains the full diagram set I would want for the project based on the current product, architecture, billing, expenses, reporting, security, and AI direction.

## Diagram index

| # | File | Purpose |
|---|------|---------|
| 1 | `01-system-context.mmd` | High-level runtime map from user to frontend, API, storage, jobs, and data stores. |
| 2 | `02-backend-domain-boundaries.mmd` | Shows modular monolith domain boundaries and key dependencies. |
| 3 | `03-org-scoping-boundary.mmd` | Explains request.org resolution, permission checks, and org-safe queries. |
| 4 | `04-core-entity-relationship.mmd` | Core data model for orgs, buildings, units, leases, billing, and expenses. |
| 5 | `05-frontend-request-lifecycle.mmd` | Shows how frontend API requests move through the layered backend. |
| 6 | `06-auth-session-flow.mmd` | Login, access token, refresh token, and logout lifecycle. |
| 7 | `07-deployment-topology.mmd` | Production deployment shape with app host, DB, Redis, worker, storage, and monitoring. |
| 8 | `08-portfolio-ownership-chain.mmd` | Core ownership chain from organization to lease and tenant. |
| 9 | `09-lease-driven-occupancy.mmd` | Occupancy derived from lease dates, not mutable flags. |
| 10 | `10-ledger-model.mmd` | Charge-payment-allocation model and derived balance principle. |
| 11 | `11-rent-charge-generation-flow.mmd` | Manual, explicit, idempotent monthly charge generation flow. |
| 12 | `12-payment-recording-allocation-flow.mmd` | Payment capture plus explicit or automatic allocation flow. |
| 13 | `13-auto-allocation-strategy.mmd` | Oldest-open-charge-first payment application logic. |
| 14 | `14-delinquency-and-alerts.mmd` | Aging buckets and deterministic billing alert signals. |
| 15 | `15-expenses-context.mmd` | How expenses fit into the overall system and reporting. |
| 16 | `16-expense-scope-model.mmd` | Rules for org, building, unit, and lease scoped expenses. |
| 17 | `17-expense-request-lifecycle.mmd` | Expense CRUD request path through views, services, selectors, and DB. |
| 18 | `18-expense-reporting-flow.mmd` | Reporting endpoint composition for expense charts and dashboards. |
| 19 | `19-dashboard-reporting-composition.mmd` | How billing, expenses, and leasing facts feed reporting surfaces. |
| 20 | `20-audit-event-flow.mmd` | Sensitive mutation to audit log flow. |
| 21 | `21-secure-file-upload-download.mmd` | Secure receipt and lease file handling with private storage and signed URLs. |
| 22 | `22-observability-logging-flow.mmd` | Correlation-aware app, audit, and error logging flow. |
| 23 | `23-scalability-evolution.mmd` | Planned architecture progression from monolith to scaled platform. |
| 24 | `24-building-profitability-inputs.mmd` | Inputs required for trustworthy property profitability views. |
| 25 | `25-executive-summary-pipeline.mmd` | Deterministic summary and PDF/dashboard output pipeline. |
| 26 | `26-ai-explanation-boundary.mmd` | Boundary between core verified math and future AI explanation. |

## 01-system-context.mmd

```mermaid
flowchart LR
    USER[Landlord / Manager / Accountant]
    FE[React + TypeScript Frontend]
    API[Django + DRF Modular Monolith]
    DB[(PostgreSQL)]
    REDIS[(Redis)]
    CELERY[Celery Workers]
    STORAGE[(Object Storage S3 / MinIO)]

    USER --> FE
    FE -->|HTTPS REST| API
    API --> DB
    API --> REDIS
    API --> STORAGE
    API --> CELERY
    CELERY --> DB
    CELERY --> REDIS
```

## 02-backend-domain-boundaries.mmd

```mermaid
flowchart LR
    CORE[core]
    PROP[properties]
    LEASE[leasing]
    BILL[billing]
    EXP[expenses]
    REP[reporting]
    INT[integrations]

    CORE --> PROP
    CORE --> LEASE
    CORE --> BILL
    CORE --> EXP
    CORE --> REP
    CORE --> INT

    PROP --> LEASE
    LEASE --> BILL
    LEASE --> EXP
    BILL --> REP
    EXP --> REP
    INT --> REP
```

## 03-org-scoping-boundary.mmd

```mermaid
flowchart TD
    REQ[Incoming Request]
    AUTH[Authenticated User]
    ORG[Resolve request.org]
    PERM[Role + membership checks]
    VIEW[DRF View / ViewSet]
    SVC[Service / Selector]
    QS[Org-scoped Queryset]
    DB[(PostgreSQL)]
    RESP[Response]

    REQ --> AUTH
    AUTH --> ORG
    ORG --> PERM
    PERM --> VIEW
    VIEW --> SVC
    SVC --> QS
    QS -->|organization_id filter| DB
    DB --> RESP

    DENY[403 / 404]
    PERM -->|fail| DENY
```

## 04-core-entity-relationship.mmd

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        string name
    }

    BUILDING {
        uuid id PK
        uuid organization_id FK
        string name
    }

    UNIT {
        uuid id PK
        uuid building_id FK
        string label
    }

    TENANT {
        uuid id PK
        uuid organization_id FK
        string full_name
    }

    LEASE {
        uuid id PK
        uuid unit_id FK
        decimal rent_amount
        date start_date
        date end_date
    }

    CHARGE {
        uuid id PK
        uuid lease_id FK
        decimal amount
        date due_date
    }

    PAYMENT {
        uuid id PK
        uuid lease_id FK
        decimal amount
        date paid_at
    }

    ALLOCATION {
        uuid id PK
        uuid payment_id FK
        uuid charge_id FK
        decimal amount
    }

    EXPENSE {
        uuid id PK
        uuid organization_id FK
        uuid building_id FK
        uuid unit_id FK
        uuid lease_id FK
        decimal amount
    }

    ORGANIZATION ||--o{ BUILDING : owns
    ORGANIZATION ||--o{ TENANT : owns
    ORGANIZATION ||--o{ EXPENSE : scopes
    BUILDING ||--o{ UNIT : contains
    UNIT ||--o{ LEASE : has
    LEASE ||--o{ CHARGE : generates
    LEASE ||--o{ PAYMENT : receives
    PAYMENT ||--o{ ALLOCATION : allocates
    CHARGE ||--o{ ALLOCATION : reduced_by
    BUILDING ||--o{ EXPENSE : incurs
    UNIT ||--o{ EXPENSE : incurs
    LEASE ||--o{ EXPENSE : contextualizes
```

## 05-frontend-request-lifecycle.mmd

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Route / Page
    participant Q as TanStack Query Hook
    participant AX as Axios Client
    participant V as DRF View / ViewSet
    participant M as Org / Permission Mixin
    participant S as Serializer
    participant B as Service or Selector
    participant D as Database

    U->>R: Navigate / submit action
    R->>Q: call query or mutation
    Q->>AX: HTTP request
    AX->>V: API request
    V->>M: resolve org + access
    M->>S: validate or shape payload
    S->>B: service / selector call
    B->>D: org-scoped query / write
    D-->>B: rows / persisted data
    B-->>S: domain result
    S-->>V: API contract
    V-->>AX: JSON response
    AX-->>Q: resolved promise
    Q-->>R: data / error state
```

## 06-auth-session-flow.mmd

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth / API Layer
    participant STORE as Access Token Memory
    participant COOKIE as HttpOnly Refresh Cookie

    U->>FE: Submit credentials
    FE->>API: POST /auth/login
    API-->>STORE: access token issued
    API-->>COOKIE: refresh token cookie set

    FE->>API: API request with access token
    API-->>FE: 200 response

    FE->>API: access token expired
    API-->>FE: 401
    FE->>API: POST /auth/refresh
    API-->>STORE: new access token
    API-->>FE: retry original request

    U->>FE: Logout
    FE->>API: POST /auth/logout
    API-->>COOKIE: refresh revoked / cleared
```

## 07-deployment-topology.mmd

```mermaid
flowchart LR
    BROWSER[Browser]
    CDN[Static Host / CDN]
    API[Application Host]
    DB[(Managed PostgreSQL)]
    REDIS[(Redis)]
    WORKER[Celery Worker]
    STORE[(S3 / MinIO)]
    MON[Monitoring / Logs]

    BROWSER --> CDN
    BROWSER --> API
    API --> DB
    API --> REDIS
    API --> STORE
    API --> MON
    WORKER --> DB
    WORKER --> REDIS
    WORKER --> STORE
    WORKER --> MON
```

## 08-portfolio-ownership-chain.mmd

```mermaid
flowchart TD
    ORG[Organization]
    BLDG[Building]
    UNIT[Unit]
    LEASE[Lease]
    TENANT[Tenant]

    ORG --> BLDG
    BLDG --> UNIT
    UNIT --> LEASE
    TENANT --> LEASE
```

## 09-lease-driven-occupancy.mmd

```mermaid
flowchart TD
    UNIT[Unit]
    LEASES[Leases for Unit]
    CHECK{Any lease where\nstart_date <= today\nand end_date is null or >= today?}
    OCC[Occupied]
    VAC[Vacant]

    UNIT --> LEASES
    LEASES --> CHECK
    CHECK -->|Yes| OCC
    CHECK -->|No| VAC
```

## 10-ledger-model.mmd

```mermaid
flowchart LR
    CHARGE[Charge\nObligation]
    PAYMENT[Payment\nCash received]
    ALLOCATION[Allocation\nApplication of payment]
    BAL[Derived Lease Balance]

    CHARGE --> BAL
    PAYMENT --> ALLOCATION
    ALLOCATION --> BAL

    FORMULA[Balance = sum charges - sum allocations]
    BAL --- FORMULA
```

## 11-rent-charge-generation-flow.mmd

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Lease Ledger UI
    participant V as Charge Generation View
    participant S as charge_generation_service
    participant VAL as billing_validation_service
    participant DB as Database
    participant AUD as audit_adapter

    U->>FE: Generate selected month
    FE->>V: POST /leases/:id/charges/generate-month
    V->>S: generate_monthly_rent_charge(...)
    S->>VAL: verify org, lease, month overlap
    S->>VAL: verify rent amount and due day
    S->>DB: check existing charge for lease + month + kind
    alt Charge already exists
        DB-->>S: existing charge
        S-->>V: idempotent existing result
    else Charge missing
        S->>DB: create posted rent charge
        S->>AUD: billing.charge.generated
        S-->>V: created result
    end
    V-->>FE: response
```

## 12-payment-recording-allocation-flow.mmd

```mermaid
sequenceDiagram
    participant FE as Payment Modal
    participant V as Payment View
    participant S as payment_write_service
    participant A as allocation_service
    participant DB as Database
    participant AUD as audit_adapter

    FE->>V: POST /payments
    V->>S: record_payment(...)
    S->>DB: create payment
    alt explicit allocations provided
        S->>A: allocate_payment(...)
        A->>DB: create allocations
    else no explicit allocations
        S->>A: auto_allocate_payment(...)
        A->>DB: allocate oldest open charges first
    end
    S->>AUD: billing.payment.created
    A->>AUD: billing.allocation.created
    V-->>FE: payment + allocation response
```

## 13-auto-allocation-strategy.mmd

```mermaid
flowchart TD
    START[New Payment]
    OPEN[list open charges for same lease]
    SORT[Sort by oldest due date]
    PICK[Take next open charge]
    CHECK{Payment remainder > 0\nand charge remainder > 0?}
    APPLY[Allocate minimum of both remainders]
    NEXT{More open charges?}
    DONE[Stop]

    START --> OPEN --> SORT --> PICK --> CHECK
    CHECK -->|Yes| APPLY --> NEXT
    CHECK -->|No| DONE
    NEXT -->|Yes| PICK
    NEXT -->|No| DONE
```

## 14-delinquency-and-alerts.mmd

```mermaid
flowchart TD
    CHARGES[Charges]
    ALLOCS[Allocations]
    ASOF[As-of Date]
    AGING[Compute aging buckets]
    ALERTS[Deterministic alert selectors]

    CHARGES --> AGING
    ALLOCS --> AGING
    ASOF --> AGING

    AGING --> CUR[current]
    AGING --> D30[1-30]
    AGING --> D60[31-60]
    AGING --> D90[61-90]
    AGING --> D90P[90+]

    AGING --> ALERTS
    ALERTS --> MISSING[Missing current-month charge]
    ALERTS --> DUE[Due soon / due today]
    ALERTS --> OVER[Overdue]
    ALERTS --> UNALLOC[Unallocated payment]
    ALERTS --> DELINQ[Delinquent lease]
```

## 15-expenses-context.mmd

```mermaid
flowchart LR
    FE[React Frontend]
    API[Django + DRF API]
    EXP[Expenses Domain]
    PROP[Buildings + Units]
    LEASE[Leasing]
    BILL[Billing / Ledger]
    REP[Reporting]
    DB[(PostgreSQL)]
    OBJ[(Object Storage / Receipts)]

    FE --> API
    API --> EXP
    EXP --> PROP
    EXP --> LEASE
    EXP --> REP
    EXP --> DB
    EXP --> OBJ
    BILL --> REP
    EXP --> REP
```

## 16-expense-scope-model.mmd

```mermaid
flowchart TD
    EXP[Expense]
    SCOPE{Scope Type}

    EXP --> SCOPE
    SCOPE --> ORG[Organization Scope]
    SCOPE --> BLDG[Building Scope]
    SCOPE --> UNIT[Unit Scope]
    SCOPE --> LEASE[Lease Scope]

    ORG --> ORG_RULE[No building / unit / lease refs]
    BLDG --> BLDG_RULE[Requires building only]
    UNIT --> UNIT_RULE[Requires building + unit]
    LEASE --> LEASE_RULE[Requires lease; derives unit + building]
```

## 17-expense-request-lifecycle.mmd

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant URL as Router
    participant VIEW as Expense ViewSet
    participant MIXIN as Org Scoped Mixin
    participant SER as Serializer
    participant SVC as Expense Service
    participant SEL as Expense Selectors
    participant DB as Database

    FE->>URL: POST/GET /api/v1/expenses/
    URL->>VIEW: route request
    VIEW->>MIXIN: resolve organization
    alt write request
        VIEW->>SER: validate input
        SER->>SVC: call business logic
        SVC->>DB: create/update/archive
    else read request
        VIEW->>SEL: list_expenses(filters)
        SEL->>DB: org-scoped query
    end
    VIEW-->>FE: serialized response
```

## 18-expense-reporting-flow.mmd

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant VIEW as ExpenseReportingViewSet
    participant MIXIN as Org Scoped Mixin
    participant SEL as Reporting Selectors
    participant SVC as Reporting Service
    participant SER as Reporting Serializer
    participant DB as Database

    FE->>VIEW: GET /expense-reporting/dashboard
    VIEW->>MIXIN: resolve org + filters
    VIEW->>SEL: monthly trend / by category / by building
    SEL->>DB: aggregate org-scoped expense data
    DB-->>SEL: grouped totals
    VIEW->>SVC: compose dashboard payload
    SVC-->>VIEW: dashboard object
    VIEW->>SER: chart-friendly JSON
    VIEW-->>FE: dashboard response
```

## 19-dashboard-reporting-composition.mmd

```mermaid
flowchart LR
    BILL[Billing / Ledger Facts]
    EXP[Expense Facts]
    LEASE[Lease / Occupancy Facts]
    REP[Reporting Layer]
    DASH[Dashboard Cards + Charts]
    EXPORTS[CSV / Year-end Export]
    AI[Future AI Explanation Layer]

    BILL --> REP
    EXP --> REP
    LEASE --> REP
    REP --> DASH
    REP --> EXPORTS
    REP --> AI
```

## 20-audit-event-flow.mmd

```mermaid
flowchart TD
    ACTION[Sensitive Mutation]
    VIEW[View / Service]
    DOMAIN[Billing / Expenses / Leasing]
    AUDIT[audit adapter / event logger]
    STORE[(Audit Log Store)]
    REVIEW[Ops / Compliance Review]

    ACTION --> VIEW
    VIEW --> DOMAIN
    DOMAIN --> AUDIT
    AUDIT --> STORE
    STORE --> REVIEW
```

## 21-secure-file-upload-download.mmd

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as DRF API
    participant VAL as File Validation
    participant STORE as Private Object Storage
    participant URL as Signed URL Service

    U->>FE: Upload receipt / lease
    FE->>API: multipart upload
    API->>VAL: validate type + size
    VAL-->>API: pass / reject
    API->>STORE: save private object
    API-->>FE: metadata response

    FE->>API: request file access
    API->>URL: generate signed URL
    URL-->>FE: temporary download URL
```

## 22-observability-logging-flow.mmd

```mermaid
flowchart LR
    REQ[Request / Job]
    CORR[Correlation ID]
    APP[Application Logs]
    AUD[Audit Logs]
    ERR[Error Logs]
    MON[Monitoring / Alerts]
    REVIEW[Developer / Operator]

    REQ --> CORR
    CORR --> APP
    CORR --> AUD
    CORR --> ERR
    APP --> MON
    AUD --> MON
    ERR --> MON
    MON --> REVIEW
```

## 23-scalability-evolution.mmd

```mermaid
flowchart LR
    P1[Phase 1\nModular Monolith]
    P2[Phase 2\nExtract reporting or integrations]
    P3[Phase 3\nRead replicas + projections + horizontal scale]

    P1 --> P2 --> P3
```

## 24-building-profitability-inputs.mmd

```mermaid
flowchart TD
    RENT[Rent / charge collections]
    EXP[Expenses]
    VAC[Vacancy / occupancy context]
    DEBT[Debt / financing later]
    PROF[Per-building profitability view]

    RENT --> PROF
    EXP --> PROF
    VAC --> PROF
    DEBT --> PROF
```

## 25-executive-summary-pipeline.mmd

```mermaid
flowchart LR
    FACTS[Deterministic portfolio metrics]
    RULES[Scoring / anomaly rules]
    SUMMARY[Executive summary payload]
    PDF[Monthly summary PDF]
    DASH[Dashboard insight cards]

    FACTS --> RULES
    FACTS --> SUMMARY
    RULES --> SUMMARY
    SUMMARY --> PDF
    SUMMARY --> DASH
```

## 26-ai-explanation-boundary.mmd

```mermaid
flowchart LR
    LEDGER[Ledger facts]
    EXP[Expense facts]
    REP[Reporting metrics]
    RULES[Deterministic business rules]
    AI[AI explanation layer]
    USER[User-facing insight]

    LEDGER --> REP
    EXP --> REP
    RULES --> REP
    REP --> AI
    AI --> USER

    NOTE[AI interprets verified metrics\nIt does not replace core math]
    AI --- NOTE
```

