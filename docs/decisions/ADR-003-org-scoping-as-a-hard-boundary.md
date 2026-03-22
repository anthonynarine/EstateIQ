# ADR-003 — Organization Scoping as a Hard Boundary

## Status
Accepted

## Context

The highest-risk failure in a multi-tenant financial system is cross-tenant data leakage.

## Decision

Treat organization scoping as a hard architectural boundary:
- resolve `request.org` on every request
- filter every queryset by organization
- test cross-org isolation continuously

## Consequences

### Positive
- clearer trust model
- stronger security posture
- easier reasoning about data ownership

### Trade-offs
- adds discipline requirements in every read and write path
