# EstateIQ

**AI-native Financial Operating System for Small Real Estate Portfolios**

Built by **Anthony Narine**  
Made in America.

---

## What this project is

EstateIQ is a finance-first platform for small real estate portfolio owners.

It is not a rent tracker.  
It is not a lightweight property directory.  
It is not built around tenant self-service first.

It is being designed as a **financial operating system** where the core platform produces structured, reliable portfolio data and AI sits on top of that data to explain risk, performance, delinquency, and portfolio health.

The target user is the small landlord or operator who needs institutional-grade financial clarity without enterprise software bloat.

---

## Product stance

Most property software starts with portals, rent collection, and surface-level operations.

EstateIQ starts with the harder and more defensible layer:

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
    C --> E[(Private Object Storage / Documents)]

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

This diagram reflects the architecture as it exists today: a React frontend, a Django + DRF modular monolith, PostgreSQL as the system of record, and private document storage for receipts and lease-related files.

It also reflects the central design principle of the product:

**The application creates trusted financial truth first, and AI interprets that truth second.**

---

## Current implementation status

### Implemented now

- React + TypeScript frontend
- Django + Django REST Framework modular monolith
- PostgreSQL as the system of record
- organization-scoped access model
- buildings, units, leasing, expenses, and reporting foundations
- billing ledger domain with initial lease-ledger workspace
- private document storage path for receipts and operational files

### Planned infrastructure

- Redis for caching and coordination where it becomes useful
- background jobs for scheduled and asynchronous workflows
- expanded observability and operational automation

This distinction matters.

The root README should describe the architecture that exists today with precision, while deeper docs can describe the infrastructure the platform is intentionally growing toward.

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

EstateIQ uses a **ledger-first** approach for money.

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

## Billing / lease ledger domain

EstateIQ treats billing as **lease-scoped accounts receivable infrastructure**.

It is not modeled as a generic payments table, and it is not modeled as one endless ledger at the unit level.

Each lease owns its own financial history.

```mermaid
flowchart TD
    B[Building]
    U[Unit]
    C[Current Lease]
    CL[Ledger for Current Lease]
    H[Lease History]
    L1[Prior Lease A]
    L2[Prior Lease B]
    LL1[Ledger A]
    LL2[Ledger B]

    B --> U
    U --> C
    C --> CL
    U --> H
    H --> L1
    H --> L2
    L1 --> LL1
    L2 --> LL2
```

### Why this matters

- the **unit** owns the occupancy timeline
- the **lease** owns the ledger
- ended leases keep their financial history
- new leases start with their own clean billing lifecycle
- late payments for an ended lease can still be recorded against that ended lease when appropriate

This keeps historical obligations from being blended across tenants and keeps the system financially trustworthy.

### Lease ledger workspace

The lease ledger page is the billing workspace for a single lease.

Its job is to let the user:

- review posted charges
- review recorded payments
- review allocations
- review remaining balance and unapplied amounts
- explicitly generate a monthly rent charge
- record payments for that lease

That page is not a unit-wide combined ledger. It is the financial workspace for one obligation context.

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

## Edge-to-core system view

```mermaid
flowchart LR
    U[User Browser] --> DNS[DNS]
    DNS --> EDGE[CDN / Edge / HTTPS Boundary]
    EDGE --> APP[React App]
    EDGE --> API[Django + DRF API]
    API --> DB[(PostgreSQL)]
    API --> OBJ[(Private Object Storage)]
    API --> FUTURE[Planned: Redis / Jobs / Observability]
```

### What each part does

#### Client
The browser loads the React application, stores minimal auth state client-side, and talks to the API over HTTPS.

The client should not become the source of financial truth. It should present portfolio state, collect user intent, and render server-backed views, dashboards, and ledgers.

#### DNS
DNS resolves the application domain and routes traffic to the edge layer.

This sits outside the app code, but it is still part of the real system architecture because every request starts here.

#### CDN / Edge / HTTPS boundary
The edge layer serves static assets, handles or forwards encrypted traffic, and is the right place for future traffic hardening and request protection.

Even if every edge optimization is not fully deployed yet, this remains the logical outer trust boundary of the system.

#### React application
The React app owns user interaction, local UI state, and client-side data fetching patterns.

It should be fast, mobile-friendly, and clear, but it should not contain the source of truth for billing, expenses, or lease state.

#### Django + DRF API
The backend is the operational core of the platform.

It owns:

- authentication and authorization
- organization resolution
- business-rule enforcement
- deterministic write behavior
- reporting orchestration
- API contracts

This is where trust is enforced.

#### PostgreSQL
PostgreSQL is the system of record.

Buildings, units, leases, expenses, charges, payments, allocations, and reporting inputs all flow from structured data stored here.

#### Private object storage
Receipts and lease documents should live in private object storage rather than bloating the relational database.

This keeps the financial core clean while still supporting real operational workflows.

#### Planned support infrastructure
Redis, background jobs, and deeper observability are important future layers, but they should be introduced when the application actually needs caching, scheduled processing, async workflows, or more advanced runtime visibility.

That is the right sequence for this product.

---

## Security boundaries

EstateIQ is a multi-tenant financial system.  
That means trust must be earned in layers.

```mermaid
flowchart TB
    USER[Authenticated User]
    CLIENT[Browser / React Client]
    EDGE[Edge / HTTPS Boundary]
    API[Django API]
    AUTH[Auth / Session Validation]
    ORG[Organization Resolution]
    PERM[Role Permissions]
    DOMAIN[Services / Selectors / Serializers]
    DB[(PostgreSQL)]
    FILES[(Private Object Storage)]
    AUDIT[Audit Logs]

    USER --> CLIENT
    CLIENT --> EDGE
    EDGE --> API
    API --> AUTH
    AUTH --> ORG
    ORG --> PERM
    PERM --> DOMAIN
    DOMAIN --> DB
    DOMAIN --> FILES
    DOMAIN --> AUDIT

    CLIENT -. never trusted for org isolation .-> DB
    CLIENT -. never trusted for authorization .-> FILES
```

### Why this matters

- The browser can render state, but it is not the final authority on access.
- Every request must be authenticated, organization-scoped, and permission-checked before domain logic runs.
- Sensitive data and files must stay inside explicit access boundaries.
- Audit logs are part of the security model, not an afterthought.

### Security model in plain English

#### The browser is not a trust boundary
The frontend can hold session context and render the right screens, but it is not the final authority on access.

The client can be tampered with. That means the backend must assume that every request needs real validation.

#### Authentication comes before business logic
Before the backend performs any domain work, it must determine whether the request belongs to a real authenticated user or service context.

This is the first application-level trust gate.

#### Organization resolution is the central tenant boundary
EstateIQ is multi-tenant. That means the most dangerous class of failure is cross-tenant leakage.

Because of that, the backend must reliably resolve the active organization and ensure every queryset and domain operation stays inside that organization.

If this step is weak, the whole system is weak.

#### Role permissions shape what authenticated users can actually do
Authentication answers **who are you**.  
Authorization answers **what are you allowed to do**.

A valid user still may not have permission to:

- invite members
- mutate lease data
- create payments
- access accounting exports
- change expense records

#### Domain logic should not bypass security assumptions
Even inside trusted backend code, services, selectors, and serializers should still assume they are operating within organization and permission constraints.

Good architecture does not forget security once the request enters the app. It carries those constraints through the runtime path.

#### Database and files need separate protection
The database holds the most sensitive structured records. Files such as receipts and lease documents are private operational assets.

Both need controlled access patterns, and neither should be treated as publicly accessible by default.

#### Audit logs are part of the trust story
In a financial platform, it is not enough to say that an action was allowed.

You also want a durable record of who did it, when they did it, and what object was touched.

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

### Why this flow matters

The frontend does not bypass the backend.  
The backend does not bypass business rules.  
The read path does not replace the write path.

That separation is what keeps the system teachable, testable, and safe.

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

### Current data layer

- PostgreSQL

### Supporting infrastructure

- private object storage for documents and receipts
- Redis and background jobs planned as the platform grows

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

### Client-side auth discipline

The frontend should keep auth handling tight:

- avoid storing refresh tokens in localStorage
- prefer secure cookie-based refresh behavior where appropriate
- keep access tokens short-lived
- keep authorization enforced on the server, not trusted to the client

### File handling discipline

Documents and receipts should be treated as private operational assets:

- validate upload type and size
- store files in private storage
- serve via signed URLs or equivalent secure access patterns

---

## AI philosophy

EstateIQ is being built so AI becomes a moat, not a gimmick.

### The rule

**AI interprets structured financial data. It does not replace the system of record.**

That means:

- core features must produce high-quality structured data
- AI should explain trends, risk, anomalies, and performance
- AI outputs should remain grounded in ledger and portfolio truth
- deterministic logic comes before AI interpretation

This is what makes future features like executive summaries, delinquency risk explanations, and portfolio health insights credible.

---

## What exists now

The current platform direction and implemented foundation already support the real shape of the product.

### Current foundation

- organization-scoped platform model
- buildings and units domain
- lease-driven occupancy model
- tenant / lease relationship flows
- expense domain and reporting-oriented architecture
- billing domain with initial lease ledger frontend workspace
- React + TypeScript frontend shell and provider structure
- Django + DRF backend with layered architecture patterns

### Actively being expanded now

- fuller **billing ledger domain**
  - charge
  - payment
  - allocation
  - lease ledger views
  - delinquency selectors
  - internal billing alerts
  - lease history to ledger navigation

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

## Architecture docs

This repository should grow a dedicated architecture docs section so the root README stays focused and the deeper system explanations stay organized.

Recommended direction:

```text
/docs
  /architecture
    /system
      README.md
      01-system-overview.md
      02-request-flow.md
      03-security-boundaries.md
      04-runtime-components.md
      /diagrams
    /billing
      README.md
      01-domain-overview.md
      02-ledger-model.md
      03-request-lifecycle.md
      04-lease-history-and-unit-timeline.md
      05-frontend-ledger-workspace.md
      /diagrams
```

The rule for these docs should be simple:

- one main idea per diagram
- each diagram paired with plain-English explanation
- keep current architecture separate from future architecture
- make domain ownership explicit
- show org scoping whenever data crosses trust boundaries

---

## Why this project exists

This system started from a real operational problem: small landlords often do not have access to software that treats their portfolio like a serious financial business.

Too many tools in this market optimize for:

- rent collection first
- tenant portal workflows first
- generic property CRUD
- shallow reporting

EstateIQ is being built from the opposite direction:

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

EstateIQ is both:

- a real operating platform for small real estate portfolios
- a demonstration of enterprise-grade SaaS architecture, financial systems design, and product discipline

Designed and built in America.
