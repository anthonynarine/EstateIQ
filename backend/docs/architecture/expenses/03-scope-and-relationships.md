# 03 — Scope and Relationships

## Why This Is the Most Important Architecture Page

Expense structure is only trustworthy if scope rules are enforced consistently.

The Expenses module currently supports four scopes:

- organization
- building
- unit
- lease

Those scopes are not cosmetic labels. They define which relationships are allowed and what the record means downstream.

---

## 1. Organization Scope

### Meaning
The expense belongs to the organization broadly rather than a specific property or tenancy context.

### Typical Examples
- accountant fee
- bookkeeping software
- umbrella insurance
- portfolio-wide consulting

### Structural Rule
An organization-scoped expense should not reference:

- building
- unit
- lease

---

## 2. Building Scope

### Meaning
The expense belongs to a single building but not a specific unit or lease.

### Typical Examples
- roof repair
- exterior painting
- common area utility
- boiler service

### Structural Rule
A building-scoped expense:

- must reference a building
- must not reference a unit
- must not reference a lease

---

## 3. Unit Scope

### Meaning
The expense belongs to a specific unit within a building.

### Typical Examples
- refrigerator replacement
- unit repaint
- flooring repair
- turnover cleaning

### Structural Rule
A unit-scoped expense:

- must reference a building
- must reference a unit
- must not reference a lease

The selected unit must also belong to the selected building.

---

## 4. Lease Scope

### Meaning
The expense is tied to a specific tenancy context.

### Typical Examples
- move-in repair attributable to a lease event
- lease-contextual reimbursement work
- tenant-caused damage tracked against occupancy context
- future resident-specific cost workflows

### Structural Rule
A lease-scoped expense:

- must reference a lease
- derives building from the lease’s unit
- derives unit from the lease’s unit
- should not carry inconsistent building/unit references

### Why Derivation Is Strong
Even though the expense is “about the lease,” reporting still needs to roll expenses up by:

- building
- unit
- lease
- category
- month

Persisting lease-derived building/unit relationships makes that downstream reporting much simpler and more trustworthy.

---

## Relationship Integrity Rules

### Organization Consistency
Every related object should belong to the same organization:

- building
- unit
- lease
- category
- vendor

This is the multi-tenant safety rule that keeps tenant boundaries intact.

### Building / Unit Consistency
If a unit is present, it must belong to the selected building.

### Lease Consistency
If a lease is present, it must belong to the same organization and point to a valid unit/building relationship.

---

## Category and Vendor Relationships

### Category
Categories make the data reportable in meaningful ways.

Without categories, charts like “expense by category” become weak or inconsistent.

### Vendor
Vendors support both operational history and future analytics:

- vendor spend concentration
- recurring contractor analysis
- vendor-level expense review
- eventually, vendor scorecards or trend analysis

---

## Attachments

Attachments are supporting documents linked to an expense.

Examples:
- receipts
- invoices
- repair documentation
- proof of payment
- contractor documents

Architecturally, the attachment belongs to the expense record but should usually be stored in object storage rather than directly in the relational database.

---

## Relationship Diagram

See: `diagrams/expenses-entity-interactions.mmd`

## Scope Diagram

See: `diagrams/expenses-context.mmd`

---

## Summary

The main point is simple:

the Expenses domain is only useful for reporting and future intelligence if the scope and relationship rules stay strict.

That is why this domain relies on service-layer validation rather than trusting the frontend to get it right.
