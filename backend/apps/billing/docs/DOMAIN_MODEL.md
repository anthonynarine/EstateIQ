
# 📚 Domain Model

## Charge

Represents an obligation owed.

### Invariants
- amount > 0
- Belongs to one lease
- Belongs to one organization

### Derived Balance

balance = amount - SUM(allocations)

---

## Payment

Represents money received.

### Invariants
- amount > 0
- Belongs to lease
- Belongs to organization

---

## Allocation

Links payment to charge.

### Invariants
- allocation.amount <= charge.remaining_balance
- SUM(payment.allocations) <= payment.amount
- charge.organization == payment.organization

---

## Financial Truth

All positions are derived.

No:
- balance fields
- cached totals
- mutable ledger snapshots

