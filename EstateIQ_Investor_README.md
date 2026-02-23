# EstateIQ 

### AI-Native Financial Operating System for Small Real Estate Portfolios

------------------------------------------------------------------------

## Executive Summary

EstateIQ is a multi-tenant, AI-native financial operating system built
for small real estate portfolio owners (1--50 units).

This is not a rent tracker.

It is a deterministic, ledger-first accounting engine with an AI
interpretation layer designed to:

-   Reduce landlord stress
-   Improve financial clarity
-   Prevent revenue leakage
-   Provide actionable portfolio intelligence

EstateIQ transforms fragmented property management into structured,
explainable financial control.

------------------------------------------------------------------------

## The Problem

Small landlords face:

-   Spreadsheet-based accounting
-   Poor delinquency visibility
-   Manual rent posting
-   No financial forecasting
-   No portfolio-level intelligence
-   Risk of cross-tenant accounting errors

Existing tools either:

-   Focus on property management UX
-   Or provide accounting software disconnected from operational leasing

None provide a deterministic, AI-enhanced financial operating system
built specifically for small portfolio owners.

------------------------------------------------------------------------

## The Solution

EstateIQ is built on three pillars:

### 1. Ledger-First Accounting

Every financial event produces structured ledger entries.

-   Charges create receivables
-   Payments allocate deterministically
-   Reports derive from ledger data only
-   No inferred financial state

This guarantees mathematical correctness.

------------------------------------------------------------------------

### 2. Strict Multi-Tenant Isolation

EstateIQ is architected as a secure SaaS platform.

**Organization = Tenant Boundary**

Each landlord business operates inside an isolated Organization.

All financial records are scoped to exactly one Organization.

``` mermaid
sequenceDiagram
  participant UI as Frontend
  participant API as Django API
  participant DB as PostgreSQL

  UI->>API: Authorization: Bearer <access>\nX-Org-Slug: juju-inc
  API->>API: Resolve request.org
  API->>DB: Filter WHERE organization_id = request.org.id
  DB-->>API: Org-scoped results
  API-->>UI: Secure response
```

Cross-tenant access is prevented by construction.

------------------------------------------------------------------------

### 3. AI Interpretation Layer

AI sits on top of deterministic financial data.

It does not modify ledger records.

It explains:

-   Revenue trends
-   Expense anomalies
-   Delinquency risk
-   Portfolio health

AI outputs are reproducible from structured financial inputs.

------------------------------------------------------------------------

## System Architecture

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

Key Characteristics:

-   Modular monolith (Django apps)
-   Service-layer business logic
-   Deterministic accounting core
-   Org-scoped query enforcement
-   AI-ready structured data model

------------------------------------------------------------------------

## Data Model Overview

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

## Competitive Advantage

EstateIQ differentiates by:

-   Deterministic ledger-first accounting
-   Strict tenant isolation
-   AI layered on structured financial truth
-   Portfolio-level intelligence
-   Designed specifically for small portfolio owners

This creates:

-   High trust
-   High switching cost
-   Strong defensibility

------------------------------------------------------------------------

## Market Opportunity

Target Segment:

-   Small to mid-size landlords (1--50 units)
-   Family-owned rental portfolios
-   LLC-managed real estate holdings

This segment is underserved by enterprise software and overwhelmed by
basic property management tools.

------------------------------------------------------------------------

## Roadmap

### Phase 1: Structured Intelligence

-   Dashboard summary
-   Delinquency tracking
-   Rent posting automation

### Phase 2: AI Simulation

-   "What if rent increases by \$100?"
-   Vacancy stress modeling
-   Underperforming building analysis

### Phase 3: Predictive Analytics

-   Delinquency prediction
-   Expense anomaly detection
-   Portfolio optimization recommendations

------------------------------------------------------------------------

## Vision

EstateIQ becomes:

-   The operating system for small landlords
-   The financial intelligence layer for rental portfolios
-   A defensible AI-native SaaS platform

------------------------------------------------------------------------

EstateIQ is being built as a production-grade, scalable, multi-tenant
SaaS system with deterministic financial architecture and explainable
AI.
