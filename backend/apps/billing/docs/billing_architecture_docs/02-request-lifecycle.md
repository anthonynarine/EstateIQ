# 02 — Billing Request Lifecycle

## Why this doc exists

The billing app now has a clean separation between write workflows and read-model construction.
This document explains how requests should move through the module.

## Mutation flow principles

Mutation requests should follow this path:

```text
URL -> View -> Serializer -> Service -> Database
```

### Rules

- the view resolves org boundary and returns HTTP responses
- the serializer validates shape and field-level constraints
- the service owns business rules and transaction boundaries
- the database stores immutable financial records

## Read flow principles

Read requests should follow this path:

```text
URL -> View -> Selector/Service facade -> Serializer -> Response
```

### Rules

- selectors own deterministic read queries and aggregation
- thin service facades are allowed when you want a stable service entry point
- views should not reconstruct ledger math

## Example flows

### Record payment

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant VIEW as CreatePaymentView
    participant SER as CreatePaymentSerializer
    participant SVC as PaymentWriteService
    participant DB as Database

    FE->>VIEW: POST /api/v1/payments/
    VIEW->>SER: validate request payload
    VIEW->>SVC: record_payment(...)
    SVC->>DB: create Payment + Allocation rows
    VIEW-->>FE: stable payment response
```

### Build lease ledger

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant VIEW as LeaseLedgerView
    participant SVC as LeaseLedgerService
    participant SEL as LeaseLedgerSelectors
    participant DB as Database

    FE->>VIEW: GET /api/v1/leases/:id/ledger
    VIEW->>SVC: build_lease_ledger(...)
    SVC->>SEL: build_lease_ledger(...)
    SEL->>DB: charges + payments + allocations query
    VIEW-->>FE: serializer-ready ledger payload
```

### Build delinquency report

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant VIEW as DelinquencyReportView
    participant SVC as DelinquencyService
    participant SEL as DelinquencySelectors
    participant DB as Database

    FE->>VIEW: GET /api/v1/reports/delinquency
    VIEW->>SVC: compute_for_org(...)
    SVC->>SEL: compute_for_org(...)
    SEL->>DB: due charges + allocations
    VIEW-->>FE: delinquency payload
```
