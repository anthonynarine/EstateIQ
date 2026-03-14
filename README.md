# EstateIQ

**Financial Operating System for Small Real Estate Portfolios**

Built by **Anthony Narine** --- Solo Full‑Stack Developer

------------------------------------------------------------------------

## Overview

EstateIQ is a production‑grade **financial operating system for small
real estate portfolios (1--50 units)**.

Most property management tools focus on **rent collection**.

EstateIQ focuses on **financial clarity**.

The system is designed to help landlords clearly understand:

-   What their portfolio earns
-   What tenants owe
-   What they spend on each property
-   Which buildings are performing well or poorly

The goal is simple:

> Give small landlords the financial visibility institutional investors
> already have.

------------------------------------------------------------------------

## Key Principles

EstateIQ is built around several non‑negotiable design principles:

1.  **Multi‑Tenant Architecture**\
    Every organization operates in an isolated data boundary.

2.  **Lease‑Driven Occupancy**\
    A unit is considered occupied only when an active lease exists.

3.  **Ledger‑First Accounting**\
    Financial history is never overwritten. Charges, payments, and
    allocations form a deterministic ledger.

4.  **Service‑Layer Business Logic**\
    Business rules live outside controllers to ensure maintainability
    and testability.

5.  **Production‑Grade Security**\
    Role‑based access control and strict organization scoping prevent
    cross‑tenant data exposure.

------------------------------------------------------------------------

## Core Domain Model

The platform models real‑world rental businesses.

    Organization
     └── Building
          └── Unit
               └── Lease
                    └── Tenant

### Organization

Represents a landlord business within the SaaS system.

### Building

A physical property owned or managed by the organization.

### Unit

An individual rentable space within a building.

### Lease

The financial contract connecting a tenant and a unit.

### Tenant

The individual renting the property.

------------------------------------------------------------------------

## Financial Ledger Model

EstateIQ tracks money using a **deterministic ledger model**.

    Charge → Payment → Allocation

### Charge

Represents money owed (typically rent).

### Payment

Represents money received.

### Allocation

Connects a payment to one or more charges.

This model ensures:

-   transparent financial history
-   reliable reporting
-   accurate delinquency calculations
-   AI‑ready financial data

------------------------------------------------------------------------

## System Architecture

    Frontend
      React + TypeScript
      TanStack Query + Axios
              │
              ▼
    Backend
      Django + Django REST Framework
      Service Layer Architecture
              │
              ▼
    Database
      PostgreSQL

Key characteristics:

-   modular monolith backend
-   strict organization‑scoped queries
-   service‑layer domain logic
-   scalable SaaS architecture

------------------------------------------------------------------------

## Technology Stack

### Frontend

-   React
-   TypeScript
-   TanStack Query
-   Tailwind CSS

### Backend

-   Django
-   Django REST Framework

### Database

-   PostgreSQL

### Authentication

-   JWT authentication
-   Secure HTTP‑only cookies in production

------------------------------------------------------------------------

## Security Model

Security is designed around strict tenant isolation.

Key protections include:

-   organization‑scoped database queries
-   role‑based permissions
-   secure authentication using JWT
-   HTTP‑only cookies in production
-   no cross‑tenant data access

------------------------------------------------------------------------

## Roadmap

### Phase 1 --- Core Platform

-   Buildings and units management
-   Tenants and lease lifecycle
-   Rent ledger (charges, payments, allocations)
-   Expense tracking
-   Portfolio dashboard

### Phase 2 --- Intelligence Layer

-   portfolio performance scoring
-   rent increase simulations
-   vacancy stress scenarios
-   automated financial summaries

### Phase 3 --- AI Copilot

-   portfolio insights
-   anomaly detection
-   financial recommendations

------------------------------------------------------------------------

## Project Motivation

EstateIQ was originally built to help **my mother manage her rental
business more effectively**.

While building the system it became clear that:

-   most property software targets large property operators
-   small landlords are often priced out of quality tools
-   existing platforms prioritize rent collection instead of financial
    insight

EstateIQ aims to solve this by providing a **clear financial operating
system for small real estate portfolios**.

------------------------------------------------------------------------

## Author

**Anthony Narine**\
Full‑Stack Software Engineer

This project serves both as:

-   a real operational tool for a family rental business
-   a demonstration of production‑grade SaaS architecture

- Made in USA
