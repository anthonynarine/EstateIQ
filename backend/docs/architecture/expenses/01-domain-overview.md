# 01 — Domain Overview

## Why the Expenses Domain Exists

The Expenses module captures operating costs in a structured, organization-scoped way so EstateIQ can support both day-to-day property management and portfolio-level financial understanding.

The module exists to record, validate, query, and report on expense records tied to one of four scopes:

- organization
- building
- unit
- lease

That structure is what turns “I spent money” into something the application can actually reason about.

## What the Expenses Domain Owns

The Expenses domain owns:

- expense records
- expense categories
- vendors
- expense attachments / supporting documents
- expense-specific reporting selectors
- expense reporting API contracts for charts and dashboards

## What the Expenses Domain Does Not Own

The Expenses domain does **not** own:

- organization identity and tenancy rules
- building lifecycle
- unit lifecycle
- lease lifecycle
- rent charges and payments
- full-platform accounting logic
- portfolio-wide executive reporting for every financial domain

That separation matters because otherwise expenses becomes a grab bag and the modular monolith loses shape.

## How Expenses Fits Inside the Backend

EstateIQ uses a modular-monolith style backend. The Expenses module follows the same backend pattern used elsewhere in the project:

- **models** define schema
- **serializers** define API shapes
- **selectors** own query/read logic
- **services** own business rules and mutations
- **views** stay thin and orchestrate HTTP concerns only

For Expenses specifically, that means:

- `ExpenseViewSet` handles CRUD-oriented expense endpoints
- `ExpenseReportingViewSet` handles aggregate/reporting endpoints
- `OrganizationScopedViewMixin` resolves organization and shared filters
- reporting selectors own grouped aggregates
- reporting serializers shape chart-friendly JSON contracts

## Why This Domain Matters to the Product

Expenses is one of the clearest examples of the product philosophy of EstateIQ:

1. capture structured data
2. keep the logic trustworthy
3. expose deterministic reporting
4. layer richer interpretation on top later

Without trustworthy expense structure:

- monthly totals are weak
- building profitability becomes blurry
- category analysis becomes unreliable
- future anomaly detection becomes noisy
- AI explanation layers become much less trustworthy

## Main Module Responsibilities

### 1. Expense Record Management
Users need to create, update, archive, and retrieve expense records.

### 2. Scope-Aware Validation
The backend must enforce scope-specific shape rules so an expense cannot point to nonsensical combinations of building/unit/lease.

### 3. Relationship Integrity
Related objects must belong to the same organization and match each other correctly.

### 4. Reporting Readiness
Expenses should be queryable in ways that support dashboards and charts without requiring the frontend to perform financial transformation work.

### 5. Supporting Documents
Receipts, invoices, and other attachments need to stay linked to the underlying expense.

## Domain Boundary Summary

A useful rule of thumb:

- if the concern is about **recording operating cost truth**, it probably belongs in Expenses
- if the concern is about **who lived there, what rent was charged, or the full accounting picture**, it likely belongs somewhere else

That keeps the module focused and lets it become a reliable source for reporting instead of a dumping ground.
