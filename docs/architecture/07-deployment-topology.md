# 07. Deployment Topology

This is a production-oriented runtime view.

```mermaid
flowchart TB
    USER[Browser / Mobile Browser]
    CDN[Frontend Host / CDN]
    API[App Runtime]
    DB[(Managed PostgreSQL)]
    REDIS[(Managed Redis)]
    STORAGE[(Private Object Storage)]
    JOBS[Worker Runtime]
    OBS[Logs / Error Tracking]

    USER --> CDN
    CDN --> API
    API --> DB
    API --> REDIS
    API --> STORAGE
    API --> JOBS
    JOBS --> DB
    JOBS --> REDIS
    API --> OBS
    JOBS --> OBS
```

## Environment model

- `dev`
- `staging`
- `prod`

Each environment should have its own database, Redis, storage bucket, and secrets.
