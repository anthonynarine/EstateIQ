# PortfolioOS System Architecture Docs

This docs set explains the **edge-to-core architecture** of PortfolioOS / EstateIQ.

The goal is to make the system readable at three levels:

1. **What enters the system** — browser, DNS, CDN, load balancer, HTTPS
2. **What runs the product** — React frontend, Django + DRF modular monolith, Redis, Celery
3. **What holds the truth** — PostgreSQL, object storage, audit logs, organization boundaries

These docs are designed to be:

- versionable in Git
- readable by engineers and stakeholders
- aligned with the current project direction
- explicit about trust boundaries, data ownership, and security

---

## Recommended reading order

1. `01-system-overview.md`
2. `02-request-flow.md`
3. `03-security-boundaries.md`
4. `04-runtime-components.md`

---

## What this section covers

This section covers:

- the full request path from client to database
- the runtime role of each major infrastructure component
- how tenant isolation is enforced
- how files, reports, and background jobs fit into the system
- how the architecture can scale without becoming chaotic

---

## What this section does not cover

This section does not try to fully document every domain flow inside each app.

That should live in dedicated domain docs such as:

- billing / ledger docs
- expenses architecture docs
- reporting docs
- auth/session docs

---

## Diagram files

The Mermaid source files live in `diagrams/` so they can evolve independently from the prose.

Included diagrams:

- `system-context.mmd`
- `request-flow.mmd`
- `security-boundaries.mmd`
- `deployment-topology.mmd`

---

## Core architectural idea

PortfolioOS is best understood as an:

> **edge-backed, multi-tenant SaaS web platform with a modular monolith core and deterministic financial data model**

That means:

- the **edge layer** handles routing, transport, and protection
- the **application layer** handles product logic and API contracts
- the **data layer** holds financial and operational truth
- the **support layer** handles cache, background work, storage, and observability
- the **security model** wraps all of it with organization isolation and least privilege
