# PortfolioOS / EstateIQ — Enterprise Entity Diagram

This ERD models the current enterprise domain in a way that is consistent with the architecture decisions already made for PortfolioOS / EstateIQ.

## Entity design principles

- Every business record is organization-scoped directly or through an org-owned parent.
- Units do **not** own occupancy truth; leases do.
- Billing records belong primarily to the **lease**.
- Money is represented as **charges, payments, and allocations**.
- Expenses remain a separate domain and feed reporting without becoming the billing system.
- Reporting is derived from source-of-truth domains rather than hand-maintained summary fields.

---

## Enterprise ERD

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string first_name
        string last_name
        string account_status
        datetime created_at
    }

    ORGANIZATION {
        uuid id PK
        string name
        string slug
        datetime created_at
    }

    ORGANIZATION_MEMBER {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string role
        string status
        datetime joined_at
    }

    BUILDING {
        uuid id PK
        uuid organization_id FK
        string name
        string building_code
        string address_line_1
        string city
        string state
        string postal_code
        datetime created_at
    }

    UNIT {
        uuid id PK
        uuid organization_id FK
        uuid building_id FK
        string unit_label
        string unit_type
        int bedrooms
        int bathrooms
        decimal market_rent
        datetime created_at
    }

    TENANT {
        uuid id PK
        uuid organization_id FK
        string first_name
        string last_name
        string email
        string phone
        datetime created_at
    }

    LEASE {
        uuid id PK
        uuid organization_id FK
        uuid unit_id FK
        string status
        date start_date
        date end_date
        decimal rent_amount
        int rent_due_day
        decimal security_deposit
        datetime created_at
    }

    LEASE_PARTY {
        uuid id PK
        uuid organization_id FK
        uuid lease_id FK
        uuid tenant_id FK
        string role
        boolean is_primary
        datetime created_at
    }

    CHARGE {
        uuid id PK
        uuid organization_id FK
        uuid lease_id FK
        string kind
        string status
        decimal amount
        date due_date
        date charge_month
        text notes
        uuid created_by_id FK
        datetime created_at
    }

    PAYMENT {
        uuid id PK
        uuid organization_id FK
        uuid lease_id FK
        decimal amount
        date paid_at
        string method
        string external_ref
        text notes
        uuid created_by_id FK
        datetime created_at
    }

    ALLOCATION {
        uuid id PK
        uuid organization_id FK
        uuid payment_id FK
        uuid charge_id FK
        decimal amount
        uuid created_by_id FK
        datetime created_at
    }

    VENDOR {
        uuid id PK
        uuid organization_id FK
        string name
        string email
        string phone
        datetime created_at
    }

    EXPENSE_CATEGORY {
        uuid id PK
        uuid organization_id FK
        string name
        string code
        datetime created_at
    }

    EXPENSE {
        uuid id PK
        uuid organization_id FK
        uuid building_id FK
        uuid unit_id FK
        uuid lease_id FK
        uuid vendor_id FK
        uuid category_id FK
        string scope
        string title
        decimal amount
        date expense_date
        text notes
        uuid created_by_id FK
        datetime created_at
    }

    EXPENSE_ATTACHMENT {
        uuid id PK
        uuid organization_id FK
        uuid expense_id FK
        string file_name
        string storage_key
        string content_type
        bigint size_bytes
        datetime created_at
    }

    AUDIT_EVENT {
        uuid id PK
        uuid organization_id FK
        uuid actor_id FK
        string event_type
        string object_type
        uuid object_id
        json metadata
        datetime created_at
    }

    USER ||--o{ ORGANIZATION_MEMBER : belongs_to
    ORGANIZATION ||--o{ ORGANIZATION_MEMBER : has

    ORGANIZATION ||--o{ BUILDING : owns
    ORGANIZATION ||--o{ UNIT : scopes
    ORGANIZATION ||--o{ TENANT : scopes
    ORGANIZATION ||--o{ LEASE : scopes
    ORGANIZATION ||--o{ LEASE_PARTY : scopes
    ORGANIZATION ||--o{ CHARGE : scopes
    ORGANIZATION ||--o{ PAYMENT : scopes
    ORGANIZATION ||--o{ ALLOCATION : scopes
    ORGANIZATION ||--o{ VENDOR : scopes
    ORGANIZATION ||--o{ EXPENSE_CATEGORY : scopes
    ORGANIZATION ||--o{ EXPENSE : scopes
    ORGANIZATION ||--o{ EXPENSE_ATTACHMENT : scopes
    ORGANIZATION ||--o{ AUDIT_EVENT : scopes

    BUILDING ||--o{ UNIT : contains
    UNIT ||--o{ LEASE : has
    LEASE ||--o{ LEASE_PARTY : includes
    TENANT ||--o{ LEASE_PARTY : participates_in

    LEASE ||--o{ CHARGE : generates
    LEASE ||--o{ PAYMENT : receives
    PAYMENT ||--o{ ALLOCATION : allocates
    CHARGE ||--o{ ALLOCATION : reduced_by

    BUILDING ||--o{ EXPENSE : can_have
    UNIT ||--o{ EXPENSE : can_have
    LEASE ||--o{ EXPENSE : can_reference
    VENDOR ||--o{ EXPENSE : supplies
    EXPENSE_CATEGORY ||--o{ EXPENSE : classifies
    EXPENSE ||--o{ EXPENSE_ATTACHMENT : has

    USER ||--o{ CHARGE : creates
    USER ||--o{ PAYMENT : creates
    USER ||--o{ ALLOCATION : creates
    USER ||--o{ EXPENSE : creates
    USER ||--o{ AUDIT_EVENT : triggers
```

---

## Domain invariants that matter

### 1. Occupancy is lease-derived

A unit is occupied because it has an active lease.

Do **not** store a separate `Unit.is_occupied` truth flag as the primary source of truth.

### 2. Billing is lease-scoped

The ownership path is:

```text
Organization -> Building -> Unit -> Lease -> Charge / Payment / Allocation
```

That means billing context is derived through the lease rather than using building or unit as the primary money owner.

### 3. Lease balance is derived

```text
lease_balance = SUM(charge.amount) - SUM(allocation.amount)
```

Do **not** store mutable balance fields as source-of-truth accounting state.

### 4. Expenses are a separate truth domain

Expenses may be building-scoped, unit-scoped, or lease-contextual, but they are not the billing system.

### 5. Audit events are first-class

Sensitive mutations should emit audit events with at least:

- organization
- actor
- event type
- object type
- object id
- timestamp
- domain-specific metadata that is safe to store

---

## Suggested GitHub note below the ERD

You can paste this under the diagram in the repo:

> PortfolioOS uses a lease-driven, ledger-first data model. Occupancy comes from active leases, not mutable unit flags. Money is modeled as charges, payments, and allocations so balances, delinquency, and future AI explanations stay deterministic and auditable.
