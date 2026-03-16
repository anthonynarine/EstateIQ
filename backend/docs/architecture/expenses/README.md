# Expenses Architecture Docs

The `expenses` domain sits at the intersection of operations, financial reporting, and future portfolio intelligence.

This docs subtree explains how the Expenses module works inside the EstateIQ backend, how it interacts with buildings, units, leases, vendors, attachments, and reporting, and why the reporting surface was intentionally separated from normal expense CRUD.

## Read This First

- `01-domain-overview.md` — what the domain owns, what it does not own, and why it matters
- `02-request-lifecycle.md` — how requests move through routers, views, serializers, services, selectors, and the database
- `03-scope-and-relationships.md` — the four expense scopes and the most important relationship rules
- `04-reporting-and-charting.md` — chart/reporting architecture and current reporting endpoints
- `05-future-evolution.md` — how the module can grow without collapsing its boundaries

## Diagrams

The Mermaid source files live in `diagrams/` so they can evolve with the codebase:

- `expenses-context.mmd`
- `expenses-request-flow.mmd`
- `expenses-entity-interactions.mmd`
- `expenses-reporting-flow.mmd`

## Core Architectural Position

The Expenses module is not just a form-entry surface. It is one of the financial truth sources in EstateIQ.

It should answer questions like:

- What did we spend this month?
- What did we spend by building?
- What did we spend by category?
- Which unit or lease generated unusual operating costs?
- Which expense records support the dashboard and future executive reporting?

At the same time, it should *not* absorb responsibilities that belong to other domains like buildings, leases, occupancy, billing, or general ledger logic.
