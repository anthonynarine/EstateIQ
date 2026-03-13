
# ARCHITECTURE_GUIDE

## Purpose

This document is the practical architecture playbook for PortfolioOS.  
It is the short-form companion to the full Engineering Handbook.

PortfolioOS is a multi-tenant rental property SaaS built with:

- React
- TypeScript
- Axios
- TanStack Query
- Django
- Django REST Framework
- PostgreSQL

The system manages:

- organizations
- buildings
- units
- tenants
- leases
- occupancy
- financial workflows

---

## Core Architecture Principles

### 1. Multi-tenant from day one
Every record must be organization-scoped.  
No query or mutation should ever cross tenant boundaries.

### 2. Lease-driven occupancy
A unit is occupied if it has an active lease.  
Do not store `Unit.is_occupied` as mutable truth.

### 3. Read contracts and write contracts are different
Write contracts are optimized for safe mutation.  
Read contracts are optimized for useful UI rendering.

### 4. Service-layer business logic
Views stay thin.  
Serializers validate.  
Services enforce domain rules and transactions.

### 5. Ledger-first finance
Financial truth should be derived from immutable records:
- charges
- payments
- allocations

Do not store mutable balance as source of truth.

---

## Layer Responsibilities

```text
React Components
   ↓
Feature Hooks / TanStack Query
   ↓
Axios API Modules
   ↓
HTTP / JSON
   ↓
DRF Views
   ↓
Serializers
   ↓
Services
   ↓
Models / ORM
   ↓
PostgreSQL
```

### Frontend
**Components**
- render UI
- manage local UI state
- call hooks

**TanStack Query**
- fetch server state
- cache results
- invalidate stale queries after mutations

**Axios API modules**
- define endpoint calls
- define request and response types
- normalize transport concerns

### Backend
**Views**
- auth
- permissions
- request context
- call serializers
- call services

**Serializers**
- validate payloads
- coerce request data
- shape responses

**Services**
- enforce business rules
- coordinate multi-model writes
- define transaction boundaries

**Selectors**
- shape read queries
- optimize fetching
- annotate computed fields

**Models**
- define structure and relationships
- enforce DB-backed integrity where possible

---

## Domain Model

```text
Organization
   ↓
Building
   ↓
Unit
   ↓
Lease
   ↓
LeaseParty
   ↓
Tenant
```

### Important relationship
```text
Unit
  ↓
Active Lease
  ↓
LeaseParty
  ↓
Tenant
```

### Why this matters
Do not model:
- `Unit.current_tenant_name`
- `Unit.tenant_id`
- `Unit.is_occupied`

Those shortcuts destroy history and create drift.

Instead:
- lease owns occupancy period
- lease party owns participant relationship
- tenant remains reusable across lease history

---

## Example Contracts

### Write contract
```json
{
  "unit_id": 42,
  "start_date": "2026-03-01",
  "end_date": null,
  "rent_amount": "2400.00",
  "deposit_amount": "2400.00",
  "due_day": 1,
  "parties": [
    {
      "tenant_id": 10,
      "role": "primary"
    }
  ]
}
```

### Read contract
```json
{
  "id": 88,
  "status": "active",
  "unit": {
    "id": 42,
    "label": "2B",
    "building": {
      "id": 7,
      "name": "Maple Street"
    }
  },
  "parties_detail": [
    {
      "role": "primary",
      "tenant": {
        "id": 10,
        "full_name": "Jamie Carter"
      }
    }
  ]
}
```

---

## Core Domain Invariants

These must always remain true:

- a unit can have at most one active lease at a time
- a lease must have exactly one primary tenant
- all attached records must belong to the same organization
- allocations cannot exceed payment amount
- allocations cannot exceed charge balance

---

## Lease Creation Flow

```text
React Form
   ↓
Draft UI State
   ↓
Submit Handler
   ↓
Write Contract
   ↓
Axios Request
   ↓
DRF View
   ↓
Input Serializer
   ↓
Service Layer
   ↓
Database Transaction
   ↓
Read Serializer
   ↓
HTTP Response
   ↓
TanStack Query Invalidation
   ↓
UI Re-render
```

---

## Error Contract

Recommended response shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Lease creation failed",
    "details": {
      "parties": [
        "A lease must have exactly one primary tenant."
      ]
    }
  }
}
```

Frontend should normalize API errors into one stable internal shape.

---

## What to Keep Out of Each Layer

### Keep out of React
- business invariants as sole enforcement
- transport plumbing repeated across components

### Keep out of serializers
- full multi-step business workflows
- transaction orchestration

### Keep out of views
- heavy branching business logic
- direct multi-model write sequences

### Keep out of models
- HTTP concerns
- random cross-domain orchestration

---

## Feature Design Checklist

Before shipping a feature, ask:

1. What is the domain action?
2. What is the write contract?
3. What is the read contract?
4. Which invariants must hold?
5. Does this require a transaction?
6. Which queries become stale afterward?
7. How is org scoping enforced?
8. What structured errors can occur?

---

## Final Standard

PortfolioOS should feel like a system where:

- the math is correct
- the lease history is trustworthy
- the tenant boundaries are secure
- the UI reflects backend truth cleanly
- future engineers can understand the flow quickly

That is what production-grade architecture looks like.
