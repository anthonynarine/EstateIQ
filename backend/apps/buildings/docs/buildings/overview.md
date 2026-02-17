# Buildings Domain — Overview

The Buildings domain establishes the **portfolio structure layer** for PortfolioOS/EstateIQ.

This is the foundation for future domains:

- Leasing (tenants, leases, rent schedules)
- Ledger (income/expense events attached to units/buildings)
- Reporting (NOI, cashflow, delinquency, portfolio health)

## Core objects

- **Building**: a property owned/managed by an Organization (tenant)
- **Unit**: a rentable unit inside a Building; also owned by the same Organization

## Tenant Isolation Pattern

The platform layer resolves tenancy:

1. Middleware reads `X-Org-Slug`
2. Middleware loads the `Organization`
3. Middleware sets `request.org`

The Buildings domain then follows a simple rule:

> Every read/write must be scoped by `request.org`.  
> If it’s not scoped, it’s a bug.
