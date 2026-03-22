# ADR-002 — Ledger-First Accounting

## Status
Accepted

## Context

The system must support trustworthy receivables, partial payments, delinquency, and reporting.

## Decision

Represent rent accounting with:
- charges
- payments
- allocations

Derive balances instead of storing mutable money state.

## Consequences

### Positive
- immutable financial history
- auditability
- better reporting
- AI-ready financial facts

### Trade-offs
- slightly more complex than a naive “balance” field
- requires careful allocation logic
