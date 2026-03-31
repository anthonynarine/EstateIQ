# 01 — Billing Domain Overview

## Purpose

The billing app is the lease-scoped accounts receivable engine for EstateIQ.

Its job is to answer deterministic financial questions such as:

- What is owed for this lease?
- What has been paid?
- How was that payment applied?
- What balance remains?
- Which leases are delinquent?

## Product framing

The billing domain is financial infrastructure.

It is not:

- a toy rent tracker
- a generic payment widget
- an owner expense tracker
- a mutable balance table

It exists so PortfolioOS can build trustworthy financial operations and later AI-native financial intelligence on top of structured ledger truth.

## Ownership chain

```text
Organization
  └── Building
        └── Unit
              └── Lease
                    ├── Charge
                    ├── Payment
                    └── Allocation
```

## Why the lease is the billing anchor

Billing records belong primarily to the lease.

That means:

- charges are lease-scoped obligations
- payments are lease-scoped cash receipts
- allocations are lease-scoped applications of cash

Building and unit context should be derived from the lease relationship, not used as the primary ownership path for billing facts.

## Non-negotiables

- do not store mutable lease balance
- do not store paid/unpaid booleans as the financial source of truth
- do not bypass organization scoping
- do not move accounting math into views
- do not allow cross-tenant data leakage
- do not silently invent financial assumptions

## Current backend architecture stance

- views stay thin
- serializers define contracts
- selectors own deterministic read logic
- services own write workflows and orchestration
- tests protect tenant boundaries and ledger math

## Core entities

### Charge
Represents money owed on a lease.

Examples:
- rent
- late fee
- misc charge

### Payment
Represents money already received and recorded into the system.

Examples:
- cash
- zelle
- ach
- check
- venmo

### Allocation
Represents how a payment is applied to one or more charges.

This is the reason the ledger stays deterministic.
