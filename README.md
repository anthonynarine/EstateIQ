# PortfolioOS / EstateIQ

**AI-native Financial Operating System for Small Real Estate Portfolios**

Built by **Anthony Narine**  
Made in America.

---

## What this project is

PortfolioOS / EstateIQ is a production-grade, finance-first platform for small real estate portfolio owners.

It is not a rent tracker.
It is not a lightweight property directory.
It is not built around tenant self-service first.

It is being designed as a **financial operating system** where the core system produces structured, reliable portfolio data and AI sits on top of that data to explain risk, performance, delinquency, and portfolio health.

The target user is the small landlord or operator who needs institutional-grade financial clarity without enterprise software bloat.

---

## Product stance

Most property software starts with portals, rent collection, and surface-level operations.

PortfolioOS starts with the harder and more defensible layer:

- property structure
- lease structure
- expense structure
- billing ledger structure
- reporting structure
- org-scoped data safety

The long-term goal is simple:

> Give small portfolio owners the kind of financial visibility, discipline, and decision support that larger operators already have.

---

## High-level platform overview

```mermaid
flowchart TD
    A[Portfolio Owner / Manager] --> B[React + TypeScript Frontend]
    B --> C[Django + DRF Modular Monolith]
    C --> D[(PostgreSQL)]
    C --> E[Redis / Background Jobs]
    C --> F[Object Storage / Documents]

    C --> G[Core / Organizations / Auth]
    C --> H[Properties]
    C --> I[Leasing]
    C --> J[Expenses]
    C --> K[Billing Ledger]
    C --> L[Reporting]
    C --> M[AI Insight Layer]

    H --> L
    I --> K
    J --> L
    K --> L
    L --> M
    D --> M
```

This architecture keeps the mathematical and operational system separate from the interpretation layer. The core application creates trusted financial data first. AI explains it second.

---

## Core domain model

```mermaid
flowchart TD
    Org[Organization]
    Bld[Building]
    Unit[Unit]
    Lease[Lease]
    Tenant[Tenant / Lease Party]
    Exp[Expense]
    Charge[Charge]
    Payment[Payment]
    Allocation[Allocation]

    Org --> Bld
    Bld --> Unit
    Unit --> Lease
    Lease --> Tenant
    Bld --> Exp
    Unit --> Exp
    Lease --> Charge
    Lease --> Payment
    Payment --> Allocation
    Charge --> Allocation
```

### Why this model matters

- **Organization** is the tenant boundary for the SaaS.
- **Buildings** and **units** define the physical portfolio structure.
- **Leases** define occupancy and financial obligation history.
- **Expenses** are asset-scoped operational outflows.
- **Charges, payments, and allocations** form a lease-scoped receivables ledger.

That separation is intentional. Expenses should not become billing, and billing should not be reduced to a simple reminder feature.

---

## Financial architecture

PortfolioOS uses a **ledger-first** approach for money.

```mermaid
flowchart LR
    Charge[Charge<br/>What is owed] --> Balance[Lease Balance]
    Allocation[Allocation<br/>Applied amount] --> Balance
    Payment[Payment<br/>Cash received] --> Allocation
```

### Core billing truth

- **Charge** = obligation owed
- **Payment** = money received externally and recorded internally
- **Allocation** = how a payment is applied to one or more charges
- **Lease balance** = derived from charges and allocations

That means the system avoids the most dangerous shortcuts:

- no mutable stored balance as financial truth
- no simplistic paid/unpaid booleans as accounting truth
- no silent financial assumptions
- no accounting logic buried in views

This is the right foundation for delinquency, reporting, future automation, and AI explanation.

---

## Current architecture approach

```mermaid
flowchart LR
    UI[Frontend UI] --> API[DRF Views / API Contracts]
    API --> S[Services<br/>business rules]
    API --> Q[Selectors<br/>read/query logic]
    S --> DB[(PostgreSQL)]
    Q --> DB
    S --> Audit[Audit Events]
    DB --> Reports[Reporting / Dashboards]
    Reports --> AI[AI Insight Layer]
```

### Architectural principles

- **Modular monolith first** for speed, correctness, and transactional safety
- **Strict organization scoping** across reads and writes
- **Thin views** with business logic in services
- **Selectors for read paths** and reporting-oriented queries
- **Ledger-derived financial state** instead of mutable shortcuts
- **Auditability** for sensitive financial mutations
- **AI on top of structured truth**, never replacing deterministic core logic

---

## What exists now

The current platform direction and implemented foundation already support the real shape of the product.

### Current foundation

- organization-scoped platform model
- buildings and units domain
- lease-driven occupancy model
- tenant / lease relationship flows
- expense domain and reporting-oriented architecture
- React + TypeScript frontend shell and provider structure
- Django + DRF backend with layered architecture patterns

### Actively being formalized now

- full **billing ledger domain**
  - charge
  - payment
  - allocation
  - lease ledger views
  - delinquency selectors
  - internal billing alerts

This is important: billing is being built as **accounts receivable infrastructure**, not as a tenant portal.

---

## Why the modular monolith is the right move

At this phase, a modular monolith is stronger than forcing microservices too early.

It gives the project:

- faster iteration
- shared transactional boundaries
- easier local development
- simpler testing
- safer refactors across leasing, expenses, billing, and reporting

That matters because the core product value is not service sprawl. It is trustworthy financial behavior.

---

## Request lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant F as React Frontend
    participant V as DRF View
    participant S as Service Layer
    participant Q as Selector Layer
    participant D as Database
    participant A as Audit / Reporting

    U->>F: Perform action or open page
    F->>V: Send org-scoped API request
    V->>S: Validate + execute business rule
    S->>D: Write deterministic state
    S->>A: Emit audit event if needed
    V->>Q: Build read model response
    Q->>D: Fetch org-scoped records
    D-->>Q: Return structured data
    Q-->>V: Return response payload
    V-->>F: JSON response
    F-->>U: Render UI / dashboard / ledger
```

---

## Technology stack

### Frontend

- React
- TypeScript
- TanStack Query
- Axios
- Tailwind CSS

### Backend

- Django
- Django REST Framework
- Service + Selector backend architecture

### Data and infrastructure

- PostgreSQL
- Redis
- background job support
- object storage for documents and receipts

### Security and auth

- organization-scoped access model
- JWT-based authentication strategy
- role-aware access controls
- production-safe session and cookie patterns

---

## Security model

Security is built around strict organization isolation.

### Non-negotiables

- all reads are organization-scoped
- all writes are organization-scoped
- users only operate inside authorized organizations
- financial domains must never leak across tenants
- audit events exist for sensitive billing actions
- AI insights must respect org boundaries

For this product, cross-tenant mistakes are not minor bugs. They are trust-killers.

---

## AI philosophy

PortfolioOS is being built so AI becomes a moat, not a gimmick.

### The rule

**AI interprets structured financial data. It does not replace the system of record.**

That means:

- core features must produce high-quality structured data
- AI should explain trends, risk, anomalies, and performance
- AI outputs should remain grounded in ledger and portfolio truth
- deterministic logic comes before AI interpretation

This is what makes future features like executive summaries, delinquency risk explanations, and portfolio health insights credible.

---

## Product roadmap

### Phase 1 — Financial foundation

- properties, units, leases, and tenants
- expense tracking
- billing ledger domain
- lease ledger views
- delinquency reporting
- internal operational alerts

### Phase 2 — Structured intelligence

- monthly executive summaries
- anomaly surfacing
- portfolio health views
- billing workbench and review queues
- richer reporting outputs

### Phase 3 — AI-native decision support

- simulation workflows
- underperformance analysis
- vacancy and rent stress scenarios
- AI explanation layer across reports and dashboards

---

## Why this project exists

This system started from a real operational problem: small landlords often do not have access to software that treats their portfolio like a serious financial business.

Too many tools in this market optimize for:

- rent collection first
- tenant portal workflows first
- generic property CRUD
- shallow reporting

PortfolioOS is being built from the opposite direction:

- financial truth first
- reporting readiness first
- multi-tenant SaaS discipline first
- AI-ready structured data first

That is what makes it more durable.

---

## Repository direction

This repository is the home of a serious vertical SaaS build.

The standard is:

- production-grade architecture
- clean domain separation
- maintainable code
- testable business logic
- GitHub-friendly documentation
- real product thinking, not demo-only scaffolding

---

## Author

**Anthony Narine**  
Full-Stack Software Engineer

PortfolioOS / EstateIQ is both:

- a real operating platform for small real estate portfolios
- a demonstration of enterprise-grade SaaS architecture, financial systems design, and product discipline

Designed and built in America.
