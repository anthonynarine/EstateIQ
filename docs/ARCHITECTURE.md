# Architecture — PortfolioOS

Date: 2026-02-13

PortfolioOS is built as a **modular monolith** (Django apps) with clean boundaries to support a future service split.

---

## System diagram (conceptual)

```
React/TS UI
   |
   | HTTPS (REST)
   v
Django + DRF (Modular Monolith)
   |
   +--> PostgreSQL (source of truth)
   +--> Redis (cache + Celery broker)
   +--> Celery workers (jobs)
   +--> Object storage (S3/MinIO) for docs/receipts
```

---

## Domain boundaries (Django apps)

### `core`
- Organization (multi-tenant)
- Membership + roles
- Auth integration (JWT/session strategies)
- Audit logs

### `properties`
- Buildings
- Units
- Addresses, metadata

### `leasing`
- Tenants
- Leases
- Lease parties (roommates)
- Lease docs

### `billing`
- Charges (rent due, late fees)
- Payments
- Allocations (apply payments to charges)
- Balance computation (ledger-derived)

### `expenses`
- Vendors
- Expenses (building or unit scoped)
- Attachments

### `reporting`
- Cash flow reports
- Delinquency / aging
- Exports (CSV)
- (Phase 2) executive PDF pack

### `integrations` (Phase 2)
- Stripe (payments)
- Plaid (bank sync)
- Email/SMS provider
- Webhooks

---

## Multi-tenancy strategy

### Entities
- `Organization`
- `OrganizationMember` (user + role)
- All domain tables include `organization_id` **or** are reachable through an org-owned parent.

### Enforcement
- DRF viewsets use org-scoped querysets (mandatory)
- Service layer functions accept `org_id`
- Add DB indexes on `(organization_id, created_at)` and other hot filters

---

## “Top-tier” money model: ledger-first

Never store money state as mutable truth.
Instead:

- `Charge`: what is owed (amount + due date)
- `Payment`: what was paid
- `Allocation`: ties payments to charges

Balance = sum(charges) - sum(allocations)

---

## Occupancy model: lease-driven

A unit is occupied if it has an active lease.

- Avoid `Unit.is_occupied` booleans
- Avoid overwriting tenant info in the unit
- Leases provide history automatically

---

## Service layer pattern (recommended)

Keep DRF views thin.
Business rules live in `services/`:

- `leasing/services/lease_lifecycle.py`
- `billing/services/ledger.py`
- `reporting/services/cashflow.py`

This supports testing and future microservice extraction.

---

## Background jobs (Celery)

MVP:
- Monthly rent charge generation
- Delinquency snapshot generation
- Receipt processing (optional)

Phase 2:
- Reminder notifications (email/SMS)
- Bank sync polling
- Executive report generation

---

## Scaling plan

Phase 1: modular monolith (fast iteration, correctness)
Phase 2: extract integrations if needed
Phase 3: reporting/analytics store if growth demands

---

## API versioning

Use `/api/v1/` for public endpoints.
Avoid breaking changes; version when required.
