
# EstateIQ (PortfolioOS)

AI‑Native Financial Operating System for Small Real Estate Portfolios

---

![EstateIQ Banner](https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80)

---

# Vision

EstateIQ is not a rent tracker.

It is a **ledger‑first, multi‑tenant financial operating system** for
landlords managing **1–50 units**.

The system is built around:

- Deterministic financial logic
- Strict tenant isolation (SaaS multi‑tenancy)
- Structured financial data for AI interpretation
- Explainable portfolio insights

The goal is to provide small landlords with the same level of clarity
that enterprise real estate systems provide to institutional investors.

---

# Author

**Anthony Narine**  
Full‑Stack Software Engineer

EstateIQ is a **solo‑built full‑stack application** created by Anthony
Narine.

The system was originally built to help **Anthony’s mother manage her
rental business more easily**. Existing property management platforms
were either:

- Too expensive for small landlords
- Designed for large apartment operators
- Focused mainly on rent collection rather than financial clarity

EstateIQ was designed to solve those problems by giving small portfolio
owners a **clear financial operating system for their properties**.

This project serves both as:

- A **real operational tool for a family business**
- A **production‑grade portfolio project demonstrating modern SaaS
architecture**

---

# Key Features

• Multi‑tenant SaaS architecture  
• Organization‑scoped property portfolios  
• Buildings → Units → Leases → Tenants domain model  
• Ledger‑first financial system for accurate reporting  
• Tenant and lease lifecycle management  
• Financial charge + payment allocation engine  
• Role‑based access for organization members  
• Real estate portfolio insights powered by structured data  

---

# Tech Stack

### Frontend
- React
- TypeScript
- TanStack Query
- TailwindCSS

### Backend
- Django
- Django REST Framework
- Service‑layer architecture

### Database
- PostgreSQL

### Authentication & Security
- JWT authentication
- **JWT stored in secure cookies in production**
- Organization membership enforcement
- Org‑scoped API requests using `X-Org-Slug`
- Strict tenant isolation across the database

---

# Real‑World Origin

EstateIQ was originally built to support a **real family‑owned rental
business**.

The author’s mother manages several rental properties through a small
family real estate company. During that process several problems became
clear:

• Small landlords lack affordable software  
• Most systems target enterprise property managers  
• Financial visibility across properties is limited  

EstateIQ was designed to support the **actual workflow of small rental
portfolio owners**.

---

# Domain Modeling

EstateIQ uses **domain‑driven design principles** rather than generic
CRUD modeling.

The core entities mirror how real property portfolios operate.

```
Organization
   └── Building
        └── Unit
             └── Lease
                  └── Tenant
```

Key modeling principles:

• **Organization** represents the SaaS tenant boundary  
• **Buildings belong to organizations**  
• **Buildings contain many units**  
• **Units may have many leases over time**  
• **Tenants participate in leases but do not own the lease record**

The **Lease** entity acts as the central financial contract connecting:

- Tenant
- Unit
- Rent amount
- Lease dates
- Financial charges

This structure mirrors real property management workflows.

---

# Multi‑Tenancy Architecture

EstateIQ supports multiple landlord businesses within a single system.

Each **Organization** represents a separate customer account.

All application data is scoped to the organization context.

Example request flow:

```
React App
   ↓
Authorization: Bearer <token>
X‑Org‑Slug: fazie-inc
   ↓
Django Middleware resolves request.org
   ↓
Queries filtered by organization_id
   ↓
Org‑scoped data returned
```

This ensures **complete data isolation between landlord businesses**.

---

# Ledger‑First Financial Model

EstateIQ uses a **deterministic financial ledger**.

Nothing is inferred without financial records.

Financial flow:

```
Rent Posting
      ↓
Charge
      ↓
Ledger Entry
      ↓
Payment
      ↓
Allocation
      ↓
Reports
```

This allows:

- Accurate receivable tracking
- Transparent payment allocation
- AI‑readable financial history

---

# Security Model

Security is built around strict multi‑tenant isolation.

Features include:

- JWT authentication
- **JWT stored in HTTP‑only cookies in production**
- Organization membership validation
- Organization‑scoped database queries
- Role‑based access control

No cross‑tenant data access is possible.

---

# System Architecture

```
React + TypeScript
        ↓
TanStack Query
        ↓
Django REST API
        ↓
Service Layer
        ↓
PostgreSQL
```

EstateIQ follows a **modular monolith architecture** to maintain
simplicity while enabling long‑term scalability.

---

# Development Principles

- Modular Django apps
- Service‑layer business logic
- Deterministic accounting
- Strict domain separation
- Org‑scoped query keys
- Predictable API contracts

---

# Roadmap

### Phase 1 — Deterministic Intelligence

- Portfolio dashboard
- Delinquency reports
- Rent posting automation

### Phase 2 — AI Simulation

- Rent increase modeling
- Vacancy stress scenarios
- Building performance analysis

### Phase 3 — Predictive Layer

- Delinquency prediction
- Expense anomaly detection
- Portfolio optimization insights

---

EstateIQ is being developed as a **production‑grade SaaS platform for
small real estate portfolios**.
