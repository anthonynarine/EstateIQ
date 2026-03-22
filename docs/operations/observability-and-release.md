# Observability and Release

```mermaid
flowchart LR
    APP[API Runtime]
    JOBS[Workers]
    LOGS[Centralized Logs]
    ERR[Error Tracking]
    SMOKE[Smoke Tests]
    REL[Release]

    APP --> LOGS
    APP --> ERR
    JOBS --> LOGS
    JOBS --> ERR
    REL --> SMOKE
```

## Release minimum

On pull request:
- backend lint + tests
- frontend lint + typecheck
- build check

On merge to staging or main:
- deploy
- run migrations
- smoke-test critical flows
