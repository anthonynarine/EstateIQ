# 04. Core Entity Relationship Diagram

This is the core data spine of the product.

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        string name
    }

    BUILDING {
        uuid id PK
        uuid organization_id FK
        string name
    }

    UNIT {
        uuid id PK
        uuid building_id FK
        string label
    }

    TENANT {
        uuid id PK
        uuid organization_id FK
        string full_name
    }

    LEASE {
        uuid id PK
        uuid unit_id FK
        date start_date
        date end_date
        decimal rent_amount
    }

    CHARGE {
        uuid id PK
        uuid lease_id FK
        decimal amount
        string kind
    }

    PAYMENT {
        uuid id PK
        uuid lease_id FK
        decimal amount
        datetime paid_at
    }

    ALLOCATION {
        uuid id PK
        uuid payment_id FK
        uuid charge_id FK
        decimal amount
    }

    EXPENSE {
        uuid id PK
        uuid organization_id FK
        uuid building_id FK
        uuid unit_id FK
        uuid lease_id FK
        decimal amount
    }

    ORGANIZATION ||--o{ BUILDING : owns
    ORGANIZATION ||--o{ TENANT : owns
    ORGANIZATION ||--o{ EXPENSE : owns
    BUILDING ||--o{ UNIT : contains
    UNIT ||--o{ LEASE : has
    LEASE ||--o{ CHARGE : generates
    LEASE ||--o{ PAYMENT : receives
    PAYMENT ||--o{ ALLOCATION : allocates
    CHARGE ||--o{ ALLOCATION : reduced_by
```

## Why this matters

This structure separates:
- property structure
- lease lifecycle
- receivables ledger
- operating expenses

That separation is what makes reporting trustworthy later.
