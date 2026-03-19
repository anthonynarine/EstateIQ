# ADR-001 — Modular Monolith

## Status
Accepted

## Context

EstateIQ needs clean domain separation, but the product is still early enough that a distributed system would add unnecessary complexity.

## Decision

Use a modular monolith backend with explicit domain boundaries:
- core
- properties
- leasing
- billing
- expenses
- reporting
- integrations

## Consequences

### Positive
- easier local development
- simpler deployment
- domain separation without microservice overhead

### Trade-offs
- requires discipline to keep boundaries clean
- future extraction still needs intentional planning
