# Rent Charge Generation Flow

Monthly rent posting should be explicit and idempotent.

```mermaid
sequenceDiagram
    participant U as User / Job
    participant API as Billing Endpoint / Service
    participant LEASE as Lease
    participant CHECK as Idempotency Check
    participant DB as Database
    participant AUDIT as Audit Log

    U->>API: generate month charge
    API->>LEASE: verify active lease + rent settings
    API->>CHECK: has this month already been generated?
    CHECK-->>API: yes / no
    alt already exists
        API-->>U: no duplicate created
    else missing
        API->>DB: create charge
        API->>AUDIT: record charge generation event
        API-->>U: charge created
    end
```

## Design rule

Do not assume automatic posting for every org by default.
A later auto-generation policy can sit on top of this deterministic service.
