# Data Model — PortfolioOS

Date: 2026-02-13

This document describes the core entities and relationships.

---

## Multi-tenancy

All data is owned by an `Organization`.

### Core
- `Organization`
- `OrganizationMember` (user + role)

---

## Properties domain

### Building
- org_id
- address fields
- metadata (year built, notes)

### Unit
- building_id
- unit_label (e.g., 1A, Top, Basement)
- optional attributes (beds/baths)

---

## Leasing domain

### Tenant
- org_id
- name, phone, email
- optional emergency contact

### Lease
- org_id
- unit_id
- start_date, end_date (nullable)
- rent_amount
- deposit_amount
- due_day (1–28)
- status derived from dates

### LeaseParty
- lease_id
- tenant_id
- role (primary, co-tenant)

### LeaseDocument
- lease_id
- file reference (S3/MinIO)
- version, uploaded_at

---

## Billing domain (ledger-first)

### Charge
- org_id
- lease_id
- kind (rent, late_fee, misc)
- amount
- due_date
- created_by
- notes

### Payment
- org_id
- lease_id
- amount
- paid_at
- method (cash, zelle, ach, check)
- external_ref (optional)
- created_by

### Allocation
- org_id
- payment_id
- charge_id
- amount

Balance:
- For a lease: sum(Charge.amount) - sum(Allocation.amount)

Aging:
- Group unpaid charges by age buckets (0–30, 31–60, 61–90, 90+)

---

## Expenses domain

### Vendor
- org_id
- name, phone, email

### Expense
- org_id
- building_id (nullable if unit_id provided)
- unit_id (nullable)
- vendor_id (nullable)
- category (mortgage, utility, repair, tax, insurance, other)
- amount
- expense_date
- notes

### ExpenseAttachment
- expense_id
- file reference
- uploaded_at

---

## Mortgage (MVP-light)

### MortgageAccount
- org_id
- building_id
- lender_name
- nickname
- principal
- interest_rate
- term_months
- start_date

Optional Phase 2:
- amortization schedule generation
- import statements

---

## Constraints to enforce

- A unit can have **at most one active lease** at a time.
- Allocations cannot exceed payment amount.
- Allocations cannot exceed charge remaining balance.

---

## Indexing recommendations

- `(org_id, created_at)` on most tables
- `(org_id, building_id)` on units
- `(org_id, lease_id, due_date)` on charges
- `(org_id, lease_id, paid_at)` on payments
