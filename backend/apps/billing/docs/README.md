# Billing App Documentation

Production-Grade Documentation
Generated: 2026-02-20T15:25:49.214122 UTC

## Overview

The billing app is the financial backbone of PortfolioOS / EstateIQ.

It implements:

- Deterministic rent charge generation
- Double-entry style allocation model
- Payment processing (auto FIFO + manual)
- Lease ledger view
- Delinquency (A/R aging) reporting
- Org dashboard summary KPIs
- Bulk rent posting engine

The system is:
- Multi-tenant safe
- Idempotent where required
- Ledger-first (no stored balances)
- Fully test-covered

This documentation covers models, services, endpoints, and system architecture.
