# Billing Architecture

## Core Philosophy

Billing is ledger-driven.

We do NOT store balances.
We compute them from:

Charge → Payment → Allocation

Balances are always derived.

---

## Data Flow

Lease → RentChargeService → Charge
Payment → AllocationService → Allocation
LedgerView → Derived Balance
Reports → Derived Metrics

---

## Idempotency

Rent generation is idempotent per lease + month.
Bulk rent posting is safe to run multiple times.

---

## Multi-Tenant Boundary

All queries filter by organization_id.
All endpoints require X-Org-Slug header.
Cross-org access returns 403 or 404.
