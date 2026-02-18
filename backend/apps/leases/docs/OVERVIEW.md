# 00 — Domain Overview

## Purpose

The Leases domain models tenancy relationships:

- **Tenant**: a person or business who occupies/pays for a unit.
- **Lease**: an agreement tying one Unit to one or more Tenants.
- **LeaseTenant**: join model that attaches Tenants to a Lease with a role.

## Domain Boundaries

- **Buildings app** owns physical inventory:
  - Building
  - Unit
- **Leases app** owns tenancy relationships:
  - Tenant
  - Lease
  - LeaseTenant

The Leases app may *reference* Units, but Units are not modified by Leases domain logic.

## Multi-Tenant Model

Every record is organization-owned:

- Tenant.organization
- Lease.organization
- LeaseTenant.organization

Tenant isolation is enforced by:

1) **Tenant middleware** resolving `request.org` from `X-Org-Slug`
2) **Org-scoped selectors** used by ViewSets for all reads
3) **Serializer validation** preventing cross-org Unit assignment
4) **Services** applying org invariants on create/update
