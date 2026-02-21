# EstateIq

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Architecture](https://img.shields.io/badge/architecture-modular_monolith-blue)
![Multi-Tenant](https://img.shields.io/badge/multi--tenant-enabled-purple)
![License](https://img.shields.io/badge/license-proprietary-red)

PortfolioOS is a **Financial Operating System for Small Real Estate
Portfolios (1--50 units)**.

It provides landlords with **financial clarity, ledger-based rent
tracking, lease-driven occupancy, and portfolio-level intelligence** ---
all built on deterministic accounting principles.

------------------------------------------------------------------------

# 🚀 Why PortfolioOS Exists

Small landlords often manage finances through:

-   Spreadsheets
-   Bank apps
-   Text messages
-   Paper receipts
-   Fragmented tools

PortfolioOS replaces that chaos with:

-   Structured financial records
-   Immutable ledger accounting
-   Clear profitability tracking
-   Accurate delinquency visibility
-   Accountant-ready exports

------------------------------------------------------------------------

# 🏗 High-Level System Architecture

``` mermaid
flowchart LR
    UI[React + TypeScript Frontend]
    API[Django + DRF Backend]
    DB[(PostgreSQL)]
    REDIS[(Redis)]
    WORKERS[Celery Workers]
    STORAGE[(Object Storage)]

    UI -->|HTTPS| API
    API --> DB
    API --> REDIS
    API --> WORKERS
    API --> STORAGE
```

------------------------------------------------------------------------

# 🧠 Core Architectural Principles

## 1. Multi-Tenant from Day One

Every record is scoped to an `Organization`.

-   No cross-tenant data leakage
-   Strict org-based query enforcement
-   Role-based permissions

## 2. Lease-Driven Occupancy

A unit is occupied if it has an active lease. There are **no manual
occupied flags**.

## 3. Ledger-First Accounting

Money is never mutated.

Balance is computed as:

    Balance = SUM(Charge.amount) - SUM(Allocation.amount)

This ensures:

-   Immutable financial history
-   Partial payment support
-   Auditability
-   Enterprise-grade accounting integrity

## 4. Modular Monolith Backend

Clear domain separation:

    backend/
      core/
      properties/
      leasing/
      billing/
      expenses/
      reporting/

------------------------------------------------------------------------

# 📊 Core Features (MVP)

### Properties

-   Buildings CRUD
-   Bulk unit creation
-   Occupancy overview

### Leasing

-   Tenants CRUD
-   Lease lifecycle management
-   Lease document storage

### Billing (Ledger)

-   Monthly rent charge generation
-   Payment recording
-   Allocation engine
-   Lease-level ledger view
-   Delinquency reporting

### Expenses

-   Categorized expense tracking
-   Receipt uploads
-   Building summaries

### Reporting

-   Monthly cash flow
-   Portfolio profitability
-   Year-end export (CSV)

------------------------------------------------------------------------

# 🔐 Security Model

-   Tenant isolation enforced at queryset level
-   Role-based permission enforcement
-   Audit logging for sensitive mutations
-   HTTPS-only production
-   Secure file storage with signed URLs

Roles:

-   owner
-   manager
-   accountant
-   read-only

------------------------------------------------------------------------

# 🏗 Frontend Architecture

Stack:

-   React
-   TypeScript
-   Axios (central API client)
-   TanStack Query (API state management)

Structure:

    frontend/
      src/
        features/
        api/
        auth/
        layouts/

------------------------------------------------------------------------

# 📈 Scalability Strategy

Phase 1: - Modular monolith - Single Postgres database - Redis for
caching + jobs

Phase 2: - Extract integrations - Extract reporting if needed

Phase 3: - Read replicas - Event-driven projections - Horizontal scaling

------------------------------------------------------------------------

# 🧩 Documentation

Deep technical documentation is available:

-   Architecture → docs/PROJECT_ARCHITECTURE.md
-   Data Model → docs/DATA_MODEL.md
-   Security → docs/SECURITY.md
-   API Contracts → docs/API_CONTRACTS.md
-   Deployment → docs/DEPLOYMENT.md

------------------------------------------------------------------------

# 🛠 Getting Started (Development)

### Prerequisites

-   Python 3.12+
-   Node 20+
-   Docker

### Local Setup

1.  Start infrastructure:

```{=html}
<!-- -->
```
    docker compose up -d

2.  Run backend:

```{=html}
<!-- -->
```
    cd backend
    python manage.py migrate
    python manage.py runserver

3.  Run frontend:

```{=html}
<!-- -->
```
    cd frontend
    npm install
    npm run dev

------------------------------------------------------------------------

# 🎯 Vision

PortfolioOS aims to become:

> The financial command center for small landlords.

Built on structured financial data, deterministic ledger math, and
scalable SaaS architecture.

------------------------------------------------------------------------

# 📌 Status

Active development --- building toward a sellable, enterprise-grade MVP.
