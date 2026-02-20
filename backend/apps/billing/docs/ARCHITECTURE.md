
# 🏗 Billing Architecture

## Design Principles

1. Deterministic ledger model
2. No stored balances
3. Idempotent monthly rent posting
4. Isolation at org boundary
5. Service-layer business logic
6. Event-ready for AI interpretation

---

## Data Flow

Lease
   ↓
RentChargeService
   ↓
Charge
   ↓
Payment
   ↓
AllocationService
   ↓
Allocation
   ↓
Derived Ledger
   ↓
Reports / Dashboard

---

## Idempotency Strategy

Rent posting is keyed by:

(lease_id, year, month)

If charge exists → return existing.
If not → create.

Bulk posting safely re-runnable.

---

## Failure Model

Bulk rent posting:
- Each lease runs in its own transaction
- Errors captured and returned
- No global rollback

---

## Scalability Considerations

- All queries filtered by organization_id
- Aggregates use database SUM operations
- Suitable for 1–50 units (initial target)
- Can be optimized via indexed due_date & lease_id

