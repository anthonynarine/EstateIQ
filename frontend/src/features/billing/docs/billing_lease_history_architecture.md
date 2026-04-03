# Billing Lease History Architecture — PortfolioOS / EstateIQ

## Purpose

This document explains how **lease history**, **unit history**, and the **billing ledger** should work together in PortfolioOS.

The goal is to keep the system:

- lease-scoped
- financially correct
- easy to understand
- easy to navigate in the UI
- extensible for future reporting and AI insights

---

## Core principle

Billing is **lease-scoped**, not unit-scoped.

That means:

- each lease gets its **own ledger**
- each unit keeps a **rolling timeline of leases**
- prior lease billing history is preserved
- a new lease does **not** overwrite the old financial history

---

## Mental model

```text
Building
  └── Unit
       ├── Current Lease
       │     └── Ledger for current lease
       └── Lease History
             ├── Prior Lease A -> Ledger A
             ├── Prior Lease B -> Ledger B
             └── Prior Lease C -> Ledger C
```

### Meaning

- The **Unit Detail Page** is the rolling occupancy and lease-history surface.
- The **Lease Ledger Page** is the billing history for one specific lease.
- The user should think of the unit as the timeline container and the lease as the accounting container.

---

## Domain ownership model

```text
Organization
  └── Building
       └── Unit
            └── Lease
                 ├── Charge
                 ├── Payment
                 └── Allocation
```

### Billing concepts

```text
Charge     = what is owed
Payment    = money received
Allocation = how a payment is applied to charges
Balance    = sum(charges) - sum(allocations)
```

### Important rule

A **lease** owns the billing history.

A **unit** does not own one endless ledger.

That separation prevents old tenant obligations from being mixed with new tenant obligations.

---

## What happens when a lease ends

When Lease A ends:

- Lease A is removed from the **Current Lease** section
- Lease A moves into the **Lease History** section
- Lease A's ledger remains intact
- Lease A can still receive late payments if those payments belong to that lease

When Lease B starts:

- Lease B becomes the **Current Lease**
- Lease B receives a new billing lifecycle
- Lease B gets its own charges, payments, allocations, and balance history

---

## Correct system behavior

### Good

- one ledger per lease
- rolling lease history at the unit level
- historical leases remain viewable
- payments can still be applied to ended leases when appropriate

### Bad

- one combined ledger for the unit across multiple tenants
- blending old tenant balances with new tenant balances
- using the unit as the primary billing container
- hiding historical billing state after a lease ends

---

## UI architecture

## 1. Unit Detail Page

The Unit Detail Page should act as the rolling history surface.

### Current Lease section

Show:

- tenant
- lease start / end dates
- rent amount
- due day
- status
- actions:
  - Edit Lease
  - View Ledger

### Lease History section

Show prior leases in reverse chronological order.

Each history row/card should contain:

- tenant display name
- lease start date
- lease end date
- lease status
- rent amount
- actions:
  - Open Lease
  - View Ledger

### Future enhancement ideas

Later, each history row can also show:

- ending balance
- days vacant before next lease
- rent change vs prior lease
- late payment indicator
- delinquency summary snapshot

---

## 2. Lease Ledger Page

The Lease Ledger Page is the **billing workspace** for a single lease.

### Purpose

This page should let the user:

- review what was owed
- review what was paid
- see how payments were applied
- see remaining balance
- generate monthly rent charges
- record lease-specific payments

### This page is not

- a unit-wide billing page
- a general expenses page
- a combined history of all tenants for the unit

---

## Navigation model

```text
Buildings
  -> Building Detail
      -> Unit Detail
          -> Current Lease
              -> View Ledger
```

And for history:

```text
Buildings
  -> Building Detail
      -> Unit Detail
          -> Lease History
              -> View Ledger
```

### Recommended navigation rules

- Primary billing navigation should exist on the **Current Lease** card.
- Historical lease rows should also offer **View Ledger**.
- The Lease Ledger Page should include **Back to Unit**.
- Do not rely on a top-nav Billing item for this workflow yet.

---

## Recommended Unit Detail page structure

```text
[Back to Units]

[Unit Header]
- building
- unit label
- occupancy
- lease count

[Current Lease]
- tenant
- lease dates
- rent
- due day
- actions:
  - Edit Lease
  - View Ledger

[Lease History]
- Prior Lease A
  - Open Lease
  - View Ledger
- Prior Lease B
  - Open Lease
  - View Ledger
- Prior Lease C
  - Open Lease
  - View Ledger
```

---

## Recommended Lease Ledger page structure

```text
[Back to Unit]

[Lease Ledger Header]
- lease status
- lease id
- tenant
- building
- unit
- rent amount
- due day

[Primary Actions]
- Record Payment
- Generate Rent Charge

[Summary Cards]
- Outstanding Balance
- Total Charges
- Total Payments
- Unapplied Amount

[Main Content]
- Charges Table
- Payments Table
- Allocations Table

[Side Panel]
- Generate Rent Charge
- Billing Notes
```

---

## Data model interpretation

### Unit page answers:

- who lived here over time?
- what lease is active now?
- what is the sequence of occupancy?
- how has rent changed over time?

### Lease ledger answers:

- what was owed for this lease?
- what was paid for this lease?
- how was payment applied?
- what balance remains?
- did this lease end with money still owed?

This distinction is one of the most important architectural boundaries in the system.

---

## Example scenario

### Unit Condo

#### Lease A
- Tenant: Andre
- Dates: Jan 1, 2025 -> Dec 31, 2025
- Ledger:
  - charges posted monthly
  - partial delinquency in November
  - final balance due after move-out

#### Lease B
- Tenant: Christina
- Dates: Feb 1, 2026 -> active
- Ledger:
  - fresh start
  - separate rent charges
  - separate payment history

### What the user sees

On the Unit Detail page:

- Current Lease: Lease B
- Lease History:
  - Lease A -> View Ledger

On the Lease A Ledger page:

- the full prior billing history remains visible
- any late payment for Lease A still belongs there

---

## Why this design is correct

This design is correct because it preserves:

- tenant-to-obligation clarity
- immutable billing history
- clean unit timeline UX
- future reporting correctness
- future AI explainability

If you later ask:

- which tenant left a balance?
- how much rent did this unit produce across leases?
- which prior lease ended delinquent?

you can answer those questions cleanly only if lease history and billing history remain properly separated.

---

## Future reporting opportunities

Once this structure is in place, the app can support:

- unit lifetime rent history
- rent progression over time by unit
- average vacancy gap between leases
- historical delinquency by lease
- move-out balance tracking
- lease closeout workflow
- AI summaries such as:
  - "This unit had 3 leases in 4 years."
  - "The prior lease ended with a remaining balance of $450."
  - "Rent increased from $500 to $650 across the last two leases."

---

## Final architectural rule

Use this rule everywhere:

> The unit owns the timeline.  
> The lease owns the ledger.

That rule will keep the billing system clean, teachable, and trustworthy.
