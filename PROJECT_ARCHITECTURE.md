# PortfolioOS --- System Architecture

PortfolioOS is a multi-tenant Financial Operating System for small real
estate portfolios (1--50 units).

------------------------------------------------------------------------

# 1. System Overview

## High-Level Architecture

``` mermaid
flowchart LR
    UI[React + TypeScript Frontend]
    API[Django + DRF Modular Monolith]
    DB[(PostgreSQL)]
    REDIS[(Redis)]
    WORKERS[Celery Workers]
    STORAGE[(Object Storage S3/MinIO)]

    UI -->|HTTPS REST| API
    API --> DB
    API --> REDIS
    API --> STORAGE
    API --> WORKERS
    WORKERS --> DB
    WORKERS --> REDIS
```

------------------------------------------------------------------------

# 2. Backend Architecture

## Domain Structure

    backend/
      core/
      properties/
      leasing/
      billing/
      expenses/
      reporting/
      integrations/

### Core Principles

-   Multi-tenant from day one
-   Lease-driven occupancy
-   Ledger-first accounting
-   Modular monolith boundaries
-   Secure-by-default

------------------------------------------------------------------------

# 3. Multi-Tenant Model

All data is scoped to:

    Organization

Enforcement: - Querysets filtered by organization_id - request.org
resolved per request - Role-based permission enforcement

------------------------------------------------------------------------

# 4. Core Entity Relationship Diagram

``` mermaid
erDiagram

    ORGANIZATION {
        uuid id PK
        string name
    }

    BUILDING {
        uuid id PK
        uuid organization_id FK
    }

    UNIT {
        uuid id PK
        uuid building_id FK
    }

    TENANT {
        uuid id PK
        uuid organization_id FK
    }

    LEASE {
        uuid id PK
        uuid unit_id FK
        decimal rent_amount
    }

    CHARGE {
        uuid id PK
        uuid lease_id FK
        decimal amount
    }

    PAYMENT {
        uuid id PK
        uuid lease_id FK
        decimal amount
    }

    ALLOCATION {
        uuid id PK
        uuid payment_id FK
        uuid charge_id FK
        decimal amount
    }

    ORGANIZATION ||--o{ BUILDING : owns
    BUILDING ||--o{ UNIT : contains
    UNIT ||--o{ LEASE : has
    LEASE ||--o{ CHARGE : generates
    LEASE ||--o{ PAYMENT : receives
    PAYMENT ||--o{ ALLOCATION : allocates
    CHARGE ||--o{ ALLOCATION : reduced_by
```

------------------------------------------------------------------------

# 5. Ledger-First Accounting Model

Balance is derived, never stored:

    Balance = SUM(Charge.amount) - SUM(Allocation.amount)

This ensures: - Immutable financial history - Partial payment support -
Auditability - No mutation of money records

------------------------------------------------------------------------

# 6. Lease-Driven Occupancy

A unit is occupied if:

    Lease.start_date <= today AND
    (Lease.end_date IS NULL OR Lease.end_date >= today)

No `is_occupied` flag exists.

------------------------------------------------------------------------

# 7. Expense Model

Expenses may attach to: - Building - Unit - Vendor

Receipts stored in object storage with signed URLs.

------------------------------------------------------------------------

# 8. Frontend Architecture

Stack: - React - TypeScript - Axios (central client) - TanStack Query
(API state management)

Structure:

    frontend/
      src/
        features/
        api/
        auth/
        layouts/

------------------------------------------------------------------------

# 9. Background Jobs

Handled via Celery: - Monthly rent generation - Delinquency
calculations - Future executive PDF reports

------------------------------------------------------------------------

# 10. Security Model

-   Tenant isolation
-   Least privilege roles
-   Audit logging
-   HTTPS-only production
-   Secure file uploads

Roles: - owner - manager - accountant - read-only

------------------------------------------------------------------------

# 11. Scalability Plan

Phase 1: - Modular monolith

Phase 2: - Extract reporting or integrations if needed

Phase 3: - Read replicas - Event-driven projections - Horizontal scaling

------------------------------------------------------------------------

# 12. Long-Term Vision

PortfolioOS becomes:

> The financial command center for small landlords.

Built on deterministic ledger math and structured financial data.
