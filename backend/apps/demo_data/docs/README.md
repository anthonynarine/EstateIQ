# Demo Data App Documentation

This docs set explains the purpose, structure, flow, and development rules for the `demo_data` app.

The `demo_data` app is not a core business-domain owner. It is **seed/orchestration infrastructure** that builds a deterministic, rerunnable demo portfolio using the real PortfolioOS / EstateIQ domain models.

## Why this app exists

The project already has tests for domain correctness, APIs, and behavior. The purpose of `demo_data` is different:

- provide believable historical data for product validation
- support staging/demo environments
- exercise the real lease + billing + expense flows over time
- provide repeatable scenario data for future reporting and AI work

## Current seeded layers

- demo owner + organization + membership
- deterministic buildings + units
- deterministic tenants
- deterministic lease history
- deterministic billing history
- verification for seeded assumptions

## Docs in this folder

- `01-purpose-and-scope.md`
- `02-architecture.md`
- `03-seed-flow.md`
- `04-scenarios-and-data-shape.md`
- `05-idempotency-and-reseed.md`
- `06-verification-and-quality-bar.md`
- `07-developer-guide.md`

## Guiding principle

This app should feel like production support infrastructure, not a throwaway script.
