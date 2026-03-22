# 01. System Context

This diagram shows the top-level runtime shape of EstateIQ.

```mermaid
flowchart LR
    USER[Landlord / Manager / Accountant]
    FE[React + TypeScript Frontend]
    API[Django + DRF Modular Monolith]
    DB[(PostgreSQL)]
    REDIS[(Redis)]
    WORKERS[Celery Workers]
    STORAGE[(Object Storage / S3 / MinIO)]

    USER --> FE
    FE -->|HTTPS REST| API
    API --> DB
    API --> REDIS
    API --> WORKERS
    API --> STORAGE
    WORKERS --> DB
    WORKERS --> REDIS
```

## Plain-English meaning

- The frontend talks to the backend over HTTPS.
- The backend owns business logic and data access.
- PostgreSQL stores the core system of record.
- Redis and Celery support background jobs and asynchronous tasks.
- Object storage holds receipts and lease documents.
