# AllocationService

## Modes

1. Auto FIFO
2. Manual explicit allocations

---

## Auto Mode

Allocates oldest unpaid charge first.

Algorithm:
- Sort charges by due_date ascending
- Allocate until payment exhausted

---

## Manual Mode

Validates:
- Charge belongs to same org
- Allocation amount ≤ remaining balance
- Sum(allocations) ≤ payment.amount
