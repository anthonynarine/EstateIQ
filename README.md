# EstateIQ

**EstateIQ** is a production-grade **Financial Operating System for Small Real Estate Portfolios (1–50 units)**.

Built by **Anthony Narine** — Solo Full-Stack Developer  
**Made in America** for real landlords who need financial clarity, not software bloat.

---

## Why EstateIQ Exists

Most property tools are built around rent collection, lightweight bookkeeping, and generic property management workflows.

EstateIQ is being built around a different idea:

> Small landlords deserve the same level of financial visibility, operational structure, and decision support that larger operators get from expensive internal systems.

This project started from a real family rental business need. The goal is not to build another rent tracker. The goal is to build a trustworthy operating system that helps owners understand:

- what the portfolio earns
- what tenants owe
- what each building costs to operate
- which units and buildings are underperforming
- where financial risk is building before it becomes a problem

---

## Product Positioning

EstateIQ is **not** a tenant-first portal in its current form.

It is a **landlord and operator financial system** built around structured, organization-scoped data.

The product is designed to support:

- lease-driven occupancy
- portfolio financial visibility
- expense and property cost tracking
- rent receivables and delinquency operations
- future AI explanations grounded in deterministic ledger data

---

## Current Platform Shape

The platform is centered around a multi-tenant real estate data model where all records belong to an `Organization`, and operational truth flows through buildings, units, leases, and tenants.

```text
Organization
 └── Building
      └── Unit
           └── Lease
                └── Tenant
```

On top of that foundation, EstateIQ is being shaped into a finance-first platform with these core areas:

- organization-scoped access and security
- buildings and units management
- tenant and lease lifecycle management
- lease-driven occupancy
- expenses and reporting inputs
- billing / ledger infrastructure for receivables
- portfolio dashboard and reporting direction

---

## Core Principles

These are the rules the product is being built around:

1. **Multi-tenant by design**  
   Every record belongs to an organization boundary.

2. **Lease-driven occupancy**  
   Units are occupied because an active lease exists, not because a manual flag was flipped.

3. **Ledger-first financial truth**  
   Money should be derived from charges, payments, and allocations, not from fragile mutable balance fields.

4. **Service-layer backend architecture**  
   Business logic belongs in services. Query logic belongs in selectors. Views stay thin.

5. **Strict org scoping and security**  
   EstateIQ is designed so cross-tenant leakage is treated as unacceptable.

6. **Explainable future AI**  
   AI should sit on top of structured financial truth, not replace it.

---

## Domain Model

The current domain foundation is:

### Organization
Represents the landlord business operating inside the SaaS boundary.

### Building
A physical property owned or managed by the organization.

### Unit
A rentable space within a building.

### Tenant
A person or household associated with lease participation.

### Lease
The legal and financial contract connecting a unit to tenant occupancy.

### Lease Party
The relationship layer that connects one or more tenants to a lease.

### Lease Documents
File-backed lease artifacts and versioned records.

### Expenses
Organization-scoped operating costs attached to buildings, units, vendors, and in some cases lease context.

### Mortgage Accounts
Lightweight property debt tracking for profitability and future portfolio intelligence.

---

## Billing / Ledger Direction

The next major financial layer is the lease-scoped billing system.

This is being designed as **accounts receivable infrastructure**, not as a simple rent reminder feature.

```text
Charge → Payment → Allocation
```

### Charge
Represents an obligation owed under a lease.

### Payment
Represents money already received externally and then recorded by the owner or manager.

### Allocation
Represents how part of a payment is applied to one or more charges.

### Derived Balance
Lease balance is calculated from ledger records:

```text
sum(charges) - sum(allocations)
```

This model is the right foundation for:

- delinquency reporting
- aging buckets
- lease ledger pages
- payment application workflows
- internal billing alerts
- later AI explanations grounded in real numbers

### Important product stance
For MVP, billing is being built as an **explicit and idempotent** workflow.

That means the system should not silently invent financial history. Monthly rent posting should be deterministic, auditable, and safe.

---

## Architecture

### Frontend
- React
- TypeScript
- TanStack Query
- Axios
- Tailwind CSS

### Backend
- Django
- Django REST Framework
- Modular monolith architecture
- Service layer + selector pattern

### Database
- PostgreSQL

### Security / Access
- organization-scoped access model
- role-based authorization
- JWT-based authentication flow
- production-safe cookie strategy

---

## Backend Philosophy

EstateIQ is being built as a **modular monolith** because it gives the project the right balance of speed, safety, and maintainability.

That means:

- domains stay separated
- financial logic stays testable
- read logic and write logic are not mixed together
- organization scoping is enforced consistently
- future extraction into services remains possible without overengineering too early

Typical backend structure follows this pattern:

```text
views -> serializers -> services -> selectors -> models/database
```

With an important rule:

- **services** own business logic and state changes
- **selectors** own queries, aggregates, and reporting reads
- **serializers** define API contracts
- **views** orchestrate request/response flow only

---

## What Makes EstateIQ Different

EstateIQ is not being built as generic property management software.

It is being built as a **financial intelligence foundation** for small portfolio owners.

That difference shows up everywhere:

- occupancy is derived from leases
- expenses are modeled for reporting, not just storage
- billing is lease-scoped and ledger-first
- dashboards are intended to answer real financial questions
- future AI is expected to explain numbers, not fabricate them

---

## Near-Term Product Scope

The current MVP direction includes:

1. organization-scoped platform foundation
2. buildings and units management
3. tenants and leases
4. expenses and reporting-ready expense data
5. billing / ledger domain
6. delinquency and lease ledger visibility
7. portfolio reporting and dashboard views

After that, the platform expands toward:

- scenario simulation
- executive summaries
- internal alerts and automations
- richer reporting exports
- AI explanations over structured portfolio data

---

## Why This Matters

Small landlords are often forced to choose between:

- overly simple tools that hide financial truth
- bloated enterprise products built for much larger operators
- spreadsheets that become fragile over time

EstateIQ is being built to close that gap.

It aims to give smaller portfolio owners a system that feels disciplined, modern, and financially trustworthy.

---

## Author

**Anthony Narine**  
Full-Stack Software Engineer

EstateIQ is both:

- a real operating system being shaped around a family rental business
- a serious demonstration of production-grade SaaS architecture, financial domain modeling, and product thinking

---

## Build Statement

**Made in America. Built with a finance-first mindset. Designed for trustworthy portfolio operations.**
