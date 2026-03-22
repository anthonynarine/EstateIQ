# Architecture

This section holds system truth.

## Reading order

1. [`01-system-context.md`](./01-system-context.md)
2. [`02-backend-domain-boundaries.md`](./02-backend-domain-boundaries.md)
3. [`03-org-scoping-boundary.md`](./03-org-scoping-boundary.md)
4. [`04-core-erd.md`](./04-core-erd.md)
5. [`05-request-lifecycle-fullstack.md`](./05-request-lifecycle-fullstack.md)
6. [`06-auth-session-flow.md`](./06-auth-session-flow.md)
7. [`07-deployment-topology.md`](./07-deployment-topology.md)
8. [`DIAGRAM_INDEX.md`](./DIAGRAM_INDEX.md)
9. [`domains/`](./domains/README.md)

## Core architectural commitments

- Multi-tenant from day one
- Strict organization scoping
- Lease-driven occupancy
- Ledger-first accounting
- Modular monolith backend
- Thin API layer, service-driven business logic
- Deterministic reporting inputs
- AI layered on structured, verified facts
