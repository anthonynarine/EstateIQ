# Payment Recording and Allocation Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Payment Service
    participant DB as Database
    participant AUTO as Auto-allocation Rule
    participant AUDIT as Audit Log

    FE->>API: submit payment
    API->>DB: create payment record
    alt explicit allocations provided
        API->>DB: validate charge ownership + amounts
        API->>DB: create allocations
    else no allocations provided
        API->>AUTO: oldest open charge first
        AUTO->>DB: create allocations until payment exhausted
    end
    API->>AUDIT: record payment/allocation events
    API-->>FE: updated ledger response
```

## Rules

- Allocations stay within the same lease.
- A payment cannot over-allocate.
- Auto-allocation should stop when the payment is exhausted.

## Why allocation matters

Without allocations, the product cannot reliably answer:

- what part of this payment is still unapplied?
- which charge is still open?
- how much of this delinquency has already been reduced?
- what happened when a payment was partially applied?

## Frontend implication

The payment entry flow should let the user:

- record a payment
- choose an allocation mode
- see the ledger refresh after success

The browser should not decide allocation validity.
That remains backend-owned.

## MVP stance

Start with:
- auto allocation
- unapplied cash support
- future manual allocation path

That gets the system usable without sacrificing correctness.
