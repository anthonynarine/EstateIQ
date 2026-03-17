# PortfolioOS / EstateIQ — System Architecture

PortfolioOS / EstateIQ is a multi-tenant financial operating system for small real estate portfolios.
It is intentionally built as a **modular monolith** first so the product can move quickly without giving up clean domain boundaries.

## Architecture principles

- **Organization-scoped from day one**
- **Lease-driven occupancy**
- **Ledger-first financial truth**
- **Thin API layer, rich service layer**
- **Selectors for deterministic reads**
- **Auditability over magic**
- **Explicit automation, not silent assumptions**

---

## 1. System context

```mermaid
flowchart TB
    user[Owner / Manager / Accountant / Read-only User]
    browser[React + TypeScript Web App]
    api[Django + DRF Modular Monolith]
    auth[Auth / JWT Session Layer]
    db[(PostgreSQL)]
    redis[(Redis)]
    workers[Celery Workers]
    storage[(Object Storage
Receipts / Docs)]
    ext[Future Integrations
Stripe / Plaid / Email / SMS]

    user --> browser
    browser -->|HTTPS REST| api
    api --> auth
    api --> db
    api --> redis
    api --> storage
    api --> workers
    workers --> db
    workers --> redis
    workers --> storage
    api -. phase 2/3 .-> ext
    workers -. phase 2/3 .-> ext
```

### Why this shape is right

- The **frontend** stays focused on workflow, state, and UX.
- The **Django monolith** keeps transactions, org scoping, and domain logic close together.
- **PostgreSQL** is the source of truth.
- **Redis + Celery** handle scheduled and async work without forcing a microservice split too early.
- **Object storage** keeps receipts and documents out of the database.

---

## 2. Container / runtime view

```mermaid
flowchart LR
    subgraph Frontend
        UI[React App
TanStack Query
Axios Client]
        Router[Route Tree
Dashboard / Tenants / Units / Lease Ledger]
        Providers[Root Providers
AuthProvider
QueryProvider
OrgProvider]
        UI --> Router
        UI --> Providers
    end

    subgraph Backend
        DRF[DRF Views / URLs]
        Services[Service Layer]
        Selectors[Selector Layer]
        Audit[Audit Adapter / Audit Log]
        DRF --> Services
        DRF --> Selectors
        Services --> Audit
    end

    subgraph Data_and_Jobs[Data + Jobs]
        PG[(PostgreSQL)]
        RD[(Redis)]
        CW[Celery Workers]
        S3[(S3 / MinIO)]
        CW --> PG
        CW --> RD
        CW --> S3
    end

    UI -->|REST| DRF
    Providers -->|auth + org context| DRF
    Services --> PG
    Selectors --> PG
    DRF --> PG
    DRF --> RD
    DRF --> S3
    DRF --> CW
```

---

## 3. Backend domain map

```mermaid
flowchart TB
    Core[core
Organizations
Memberships
Roles
Audit]
    Properties[properties
Buildings
Units
Addresses]
    Leasing[leasing
Tenants
Leases
Lease Parties
Occupancy Truth]
    Billing[billing
Charges
Payments
Allocations
Delinquency Ops]
    Expenses[expenses
Expenses
Vendors
Categories
Attachments]
    Reporting[reporting
Cash Flow
Delinquency
Portfolio Views
Exports]
    Integrations[integrations
Stripe / Plaid / Email / SMS
Phase 2+]

    Core --> Properties
    Core --> Leasing
    Core --> Billing
    Core --> Expenses
    Core --> Reporting
    Core --> Integrations

    Properties --> Leasing
    Leasing --> Billing
    Properties --> Expenses
    Leasing --> Expenses
    Billing --> Reporting
    Expenses --> Reporting
    Integrations -. optional sync / delivery .-> Billing
    Integrations -. optional sync / delivery .-> Reporting
```

### Domain ownership rules

- `core` owns org identity, membership, and access control.
- `properties` owns real estate structure.
- `leasing` owns occupancy truth and lease lifecycle.
- `billing` owns receivables truth: charges, payments, allocations.
- `expenses` owns spend truth and receipts.
- `reporting` owns aggregate read surfaces, not source-of-truth records.

---

## 4. Request lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as React UI
    participant Q as TanStack Query / Axios
    participant V as DRF View
    participant S as Service Layer
    participant X as Selector Layer
    participant DB as PostgreSQL
    participant A as Audit Log

    U->>FE: Open lease ledger / submit payment / generate rent
    FE->>Q: Build request with auth + org context
    Q->>V: /api/v1/... request

    alt Write path
        V->>S: Validate contract + call business service
        S->>DB: transaction.atomic write(s)
        S->>A: Emit audit event
        S->>X: fetch fresh rich response if needed
        X->>DB: deterministic read query
        DB-->>X: result
        X-->>S: shaped domain data
        S-->>V: service result
    else Read path
        V->>X: org-scoped selector call
        X->>DB: optimized read query
        DB-->>X: result
        X-->>V: deterministic response payload
    end

    V-->>Q: JSON response
    Q-->>FE: cache + render
    FE-->>U: updated screen
```

### Why this matters

This keeps:

- **views thin**
- **business rules in services**
- **read/report logic in selectors**
- **database writes transaction-safe**
- **audit events attached to sensitive actions**

---

## 5. Financial truth model

```mermaid
flowchart LR
    Charge[Charge
What is owed]
    Payment[Payment
Cash received]
    Allocation[Allocation
How payment is applied]
    Balance[Derived Lease Balance]

    Charge --> Allocation
    Payment --> Allocation
    Charge -. contributes to .-> Balance
    Allocation -. reduces .-> Balance
```

**Balance is derived, never stored as mutable truth.**

```text
lease_balance = SUM(charges.amount) - SUM(allocations.amount)
```

That supports:

- partial payments
- aging buckets
- delinquency reporting
- auditability
- future AI explanations grounded in real math

---

## 6. Job and automation posture

```mermaid
flowchart LR
    Manual[Explicit User Trigger
Generate Month / Record Payment]
    Rules[Deterministic Rules
Eligibility / Due Date / Idempotency]
    Jobs[Celery Jobs
Scheduled work where safe]
    Alerts[Internal Billing Alerts
Missing charge / overdue / unallocated]
    Notifications[Optional Email / SMS
Later]

    Manual --> Rules
    Rules --> Alerts
    Rules --> Jobs
    Alerts -. phase 2 .-> Notifications
    Jobs -. phase 2/3 .-> Notifications
```

The system favors **deterministic but explicit** operations before full automation.
