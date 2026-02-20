
# AllocationService

## Modes

1. Auto FIFO
2. Manual explicit allocations

---

## Auto Mode Algorithm

1. Fetch unpaid charges sorted by due_date
2. Allocate oldest first
3. Continue until payment exhausted

---

## Manual Mode

Validates:
- Charge belongs to org
- Charge belongs to lease
- Allocation <= remaining balance
- Sum allocations <= payment.amount

---

## Guarantees

- No over-allocation
- No cross-tenant allocation
