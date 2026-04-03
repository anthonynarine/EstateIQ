# Billing Domain

The billing domain is the **receivables subledger** for a lease.

It exists to answer:

- what is owed?
- what has been paid?
- how was payment applied?
- what balance remains?
- which leases are delinquent?
- which billing actions still need review?

It is being built as **financial infrastructure**, not as a tenant portal or a lightweight reminder feature.

---

## Owns

- charges
- payments
- allocations
- lease ledger
- delinquency logic
- internal billing alerting
- lease-scoped billing workspace on the frontend
- lease history to ledger navigation rules

## Does not own

- tenant self-service payments in MVP
- automatic assumptions about rent posting
- unit-wide combined ledgers
- portfolio-wide reporting composition
- owner expense tracking

---

## Core rule

> The unit owns the timeline.  
> The lease owns the ledger.

That means:

- a **unit** keeps the rolling lease history
- each **lease** keeps its own immutable billing history
- a new lease starts with a new ledger
- an ended lease still preserves its charges, payments, allocations, and derived balance history

---

## Read next

- [`01-domain-overview.md`](./01-domain-overview.md)
- [`02-ledger-model.md`](./02-ledger-model.md)
- [`03-rent-charge-generation-flow.md`](./03-rent-charge-generation-flow.md)
- [`04-payment-allocation-flow.md`](./04-payment-allocation-flow.md)
- [`05-delinquency-and-alerts.md`](./05-delinquency-and-alerts.md)
- [`06-lease-history-and-unit-timeline.md`](./06-lease-history-and-unit-timeline.md)
- [`07-frontend-ledger-workspace.md`](./07-frontend-ledger-workspace.md)

---

## Diagram sources

Mermaid source files live in:

```text
diagrams/
```

Keep the markdown docs focused on explanation and keep the raw diagram files versionable and easy to evolve.
