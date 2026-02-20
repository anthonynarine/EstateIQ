# Testing Strategy

## Coverage Areas

- Idempotency
- FIFO allocation correctness
- Manual allocation validation
- Org isolation
- Derived financial calculations
- Bulk rent posting safety

Tests simulate:
- Multiple charges
- Partial payments
- Cross-tenant access
- Repeated rent posting

Goal: deterministic financial correctness.
