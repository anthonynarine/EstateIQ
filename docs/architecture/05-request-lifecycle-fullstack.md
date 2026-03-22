# 05. Fullstack Request Lifecycle

This is the typical path from UI action to database write.

```mermaid
sequenceDiagram
    participant UI as React Page
    participant Q as Query Hook / Mutation
    participant HTTP as Axios Client
    participant URL as Router
    participant VIEW as DRF View / ViewSet
    participant SER as Serializer
    participant SVC as Service
    participant SEL as Selector
    participant DB as PostgreSQL

    UI->>Q: user action
    Q->>HTTP: request config
    HTTP->>URL: HTTP request
    URL->>VIEW: route request
    VIEW->>SER: validate / serialize
    SER->>SVC: structured payload
    SVC->>SEL: read supporting records if needed
    SVC->>DB: write transaction
    DB-->>VIEW: persisted result
    VIEW->>SER: response shaping
    VIEW-->>HTTP: JSON response
    HTTP-->>Q: resolved data
    Q-->>UI: cache update / re-render
```

## Architectural meaning

- Frontend pages should orchestrate, not own business rules.
- The Axios client centralizes auth and transport behavior.
- Views stay thin.
- Serializers define contracts.
- Services own mutation rules.
- Selectors own read/query logic.
