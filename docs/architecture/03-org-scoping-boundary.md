# 03. Organization Scoping Boundary

Cross-tenant leakage is the highest-priority architectural failure to avoid.

```mermaid
flowchart TD
    REQ[Incoming Request]
    AUTH[Authenticated User]
    ORG[Resolve request.org]
    PERM[Role / permission checks]
    VIEW[View / endpoint]
    SEL[Selectors]
    SVC[Services]
    DB[(Org-scoped querysets)]

    REQ --> AUTH --> ORG --> PERM --> VIEW
    VIEW --> SEL
    VIEW --> SVC
    SEL --> DB
    SVC --> DB
```

## Rules

- Every request must resolve an organization context.
- Every queryset must be filtered by organization.
- Role checks must happen before sensitive actions.
- Tests must assert that one org cannot see another org’s data.
