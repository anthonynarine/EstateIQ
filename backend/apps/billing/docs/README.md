# 📦 Billing Engine — Enterprise Documentation

> PortfolioOS / EstateIQ Financial Core  
> Generated: 2026-02-20T15:31:35.204103 UTC

---

## Executive Summary

The Billing app is the deterministic financial engine powering PortfolioOS.

It is:

- Ledger-first
- Multi-tenant safe
- Idempotent
- Fully test-driven
- AI-ready
- Production hardened

This system converts leases into structured financial intelligence through:

- Rent charge generation
- Payment allocation engine (FIFO + manual)
- Derived lease ledger
- A/R aging (delinquency engine)
- Dashboard KPI aggregation
- Bulk rent posting operations

---

## Documentation Structure

| File | Description |
|------|-------------| ARCHITECTURE.md | System design & data flow |
| DOMAIN_MODEL.md | Model invariants & data rules |
| SERVICES/ | Detailed service-level specs |
| API/ | Endpoint contracts |
| TESTING.md | Testing strategy & guarantees |
| SECURITY.md | Multi-tenant & financial integrity controls |
| AI_READINESS.md | How billing supports intelligence layer |

---

## Core Philosophy

Balances are **never stored**.

All financial positions are derived from:

Charge → Payment → Allocation

This guarantees:

- No drift
- No hidden state
- Auditability
- Reproducibility
