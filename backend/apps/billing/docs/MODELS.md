# Models

## Charge

Represents money owed.

Fields:
- organization
- lease
- kind (RENT, FEE, etc.)
- amount
- due_date

Balance is derived:
balance = amount - SUM(allocations)

---

## Payment

Represents money received.

Fields:
- organization
- lease
- amount
- paid_at
- method
- external_ref
- notes

---

## Allocation

Links a Payment to a Charge.

Fields:
- organization
- payment
- charge
- amount

Invariant:
SUM(allocations for payment) ≤ payment.amount
