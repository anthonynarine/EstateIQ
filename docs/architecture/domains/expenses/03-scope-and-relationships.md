# Expense Scope and Relationships

This is one of the most important design pages in the whole repo.

```mermaid
flowchart TD
    EXP[Expense]
    SCOPE{Scope}
    ORG[Organization-scoped]
    BLDG[Building-scoped]
    UNIT[Unit-scoped]
    LEASE[Lease-scoped]

    EXP --> SCOPE
    SCOPE --> ORG
    SCOPE --> BLDG
    SCOPE --> UNIT
    SCOPE --> LEASE

    LEASE -->|derive and persist| UNIT
    UNIT -->|belongs to| BLDG
```

## Relationship map

```mermaid
flowchart TD
    ORG[Organization]
    BLDG[Building]
    UNIT[Unit]
    LEASE[Lease]
    CAT[ExpenseCategory]
    VENDOR[Vendor]
    EXP[Expense]
    ATTACH[ExpenseAttachment]

    ORG --> BLDG
    ORG --> UNIT
    ORG --> LEASE
    ORG --> CAT
    ORG --> VENDOR
    ORG --> EXP

    BLDG --> UNIT
    UNIT --> LEASE

    CAT --> EXP
    VENDOR --> EXP
    BLDG --> EXP
    UNIT --> EXP
    LEASE --> EXP

    EXP --> ATTACH
```

## Key design rule

Even if an expense is lease-scoped, reporting should still be able to roll it up by:
- building
- unit
- lease
- category
- time period

That is why deriving and persisting building and unit relationships from the lease is a strong design decision.
