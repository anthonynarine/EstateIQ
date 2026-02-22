# EstateIQ (PortfolioOS)

AI‑Native Financial Operating System for Small Real Estate Portfolios

------------------------------------------------------------------------

# 1. Vision

EstateIQ is not a rent tracker.

It is a **ledger‑first, multi‑tenant financial operating system** for
landlords managing 1--50 units.

The system is built around:

-   Deterministic financial logic
-   Strict tenant isolation (SaaS multi‑tenancy)
-   Structured data for AI interpretation
-   Explainable financial insights

------------------------------------------------------------------------

# 2. Multi‑Tenancy: The Organization Boundary

## What "Organization is the tenant boundary" means

In SaaS terminology, a *tenant* is a customer account boundary.

In EstateIQ:

-   **Organization = SaaS tenant boundary (landlord business)**
-   **OrganizationMember = internal user inside an organization**
-   **Tenant (model) = renter paying rent (NOT a SaaS tenant)**

This distinction is critical.

------------------------------------------------------------------------

## Why This Matters

Multiple landlord businesses share:

-   The same database
-   The same backend
-   The same application

But they must NEVER see each other's data.

The `Organization` model is the wall between customers.

------------------------------------------------------------------------

## How Isolation Works

``` mermaid
sequenceDiagram
  participant UI as React Frontend
  participant API as Django API
  participant DB as PostgreSQL

  UI->>API: Authorization: Bearer <access>\nX-Org-Slug: juju-inc
  API->>API: Middleware resolves request.org
  API->>API: Permission checks membership + role
  API->>DB: Query WHERE organization_id = request.org.id
  DB-->>API: Org-scoped results
  API-->>UI: Response
```

------------------------------------------------------------------------

## Orgless vs Org‑Scoped Endpoints

### Orgless (bootstrap)

-   Create organization
-   List organizations

Requires: - Bearer authentication - NO X-Org-Slug

### Org‑Scoped

-   Buildings
-   Units
-   Tenants (renters)
-   Leases
-   Ledger
-   Reports
-   Payments

Requires: - Bearer token - X-Org-Slug header - Membership validation

------------------------------------------------------------------------

# 3. Data Architecture (High-Level)

``` mermaid
erDiagram
  ORGANIZATION ||--o{ ORGANIZATION_MEMBER : has
  ORGANIZATION ||--o{ BUILDING : owns
  BUILDING ||--o{ UNIT : contains
  ORGANIZATION ||--o{ TENANT : tracks
  UNIT ||--o{ LEASE : has
  TENANT ||--o{ LEASE : participates
  LEASE ||--o{ CHARGE : generates
  LEASE ||--o{ PAYMENT : receives
  PAYMENT ||--o{ ALLOCATION : applies_to
  CHARGE ||--o{ ALLOCATION : settles
```

------------------------------------------------------------------------

# 4. Ledger‑First Financial Model

EstateIQ is ledger-first.

Nothing is inferred without entries.

## Flow of Money

``` mermaid
flowchart LR
  RentPosting --> Charge
  Charge --> LedgerEntry
  Payment --> Allocation
  Allocation --> LedgerEntry
  LedgerEntry --> Reports
```

-   Charges create receivables
-   Payments allocate against charges
-   Ledger entries drive reports
-   AI interprets structured financial data

------------------------------------------------------------------------

# 5. Role Model (Internal Users)

OrganizationMember roles:

-   owner
-   manager
-   accountant
-   read_only

Roles control: - Write access - Report access - Financial actions -
Administrative control

------------------------------------------------------------------------

# 6. System Architecture Overview

``` mermaid
flowchart TB

  subgraph Frontend
    React[React + TypeScript]
    Query[TanStack Query]
  end

  subgraph Backend
    Django[Django + DRF]
    Auth[JWT Authentication]
    Middleware[Org Resolution Middleware]
    Services[Service Layer]
  end

  subgraph Database
    Postgres[(PostgreSQL)]
  end

  React --> Query
  Query --> Django
  Django --> Middleware
  Middleware --> Services
  Services --> Postgres
```

------------------------------------------------------------------------

# 7. Security Model

-   JWT-based authentication
-   Organization membership enforcement
-   X-Org-Slug required for org-scoped endpoints
-   All queries filtered by organization
-   No cross-tenant data access

------------------------------------------------------------------------

# 8. AI-First Design Philosophy

EstateIQ is designed so that:

-   All financial actions produce structured ledger data
-   AI reads from deterministic data
-   AI never mutates financial records
-   AI explanations reference actual ledger entries

AI is an interpretation layer --- not a replacement for financial logic.

------------------------------------------------------------------------

# 9. Development Principles

-   Modular monolith (Django apps)
-   Service-layer business logic
-   Deterministic accounting
-   Strict domain separation
-   URL-driven org context
-   Org-scoped TanStack query keys

------------------------------------------------------------------------

# 10. Roadmap

Phase 1: Deterministic Intelligence - Dashboard summary - Delinquency
report - Rent posting automation

Phase 2: AI Simulation - Rent increase modeling - Vacancy stress
scenarios - Underperforming building analysis

Phase 3: Predictive Layer - Delinquency prediction - Expense anomaly
detection - Portfolio optimization recommendations

------------------------------------------------------------------------

EstateIQ is being built as a production-grade, defensible SaaS product.
