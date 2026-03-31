# Billing Architecture Docs — EstateIQ / PortfolioOS

This docs pack captures the architecture, domain rules, request lifecycles, and future evolution of the `billing` app.

The billing domain is the lease-scoped accounts receivable engine for EstateIQ.
It is not a generic payment form and it is not a tenant self-service portal.

## What this domain owns

- rent and other lease-scoped charges
- payment recording
- payment allocation to charges
- lease ledger read models
- delinquency / aging read models
- org-level billing summary metrics
- current-month rent posting workflows

## What this domain does not own

- lease lifecycle truth
- building or unit ownership as a primary billing key
- owner-side expenses
- broad cross-domain cash flow synthesis
- AI interpretation logic

## Core financial model

```text
Charge     = what is owed
Payment    = money received
Allocation = how a payment is applied
Balance    = sum(charges) - sum(allocations)
```

## Docs map

- `01-domain-overview.md`
- `02-request-lifecycle.md`
- `03-ledger-and-allocation-model.md`
- `04-reporting-and-selectors.md`
- `05-operations-observability-and-security.md`
- `06-future-evolution.md`
- `diagrams/`

## Recommended repo location

```text
docs/
  architecture/
    billing/
      README.md
      01-domain-overview.md
      02-request-lifecycle.md
      03-ledger-and-allocation-model.md
      04-reporting-and-selectors.md
      05-operations-observability-and-security.md
      06-future-evolution.md
      diagrams/
        billing-context.mmd
        billing-request-flow.mmd
        billing-ledger-relationships.mmd
        billing-selector-service-boundary.mmd
        billing-reporting-flow.mmd
```
