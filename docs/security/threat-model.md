# Threat Model

```mermaid
flowchart TD
    CT[Cross-tenant data leakage]
    BF[Credential stuffing / brute force]
    XSS[XSS -> token theft]
    CSRF[CSRF if cookies are used]
    FILE[Insecure file uploads]
    INSIDER[Insider misuse]
    AUDIT[Audit logs]
    ORG[Org scoping]
    RATE[Rate limiting]
    COOKIES[Secure cookie strategy]
    BUCKET[Private bucket + signed URLs]

    CT --> ORG
    BF --> RATE
    XSS --> COOKIES
    CSRF --> COOKIES
    FILE --> BUCKET
    INSIDER --> AUDIT
```

## Non-negotiables

- organization isolation on every request
- least-privilege roles
- audit logging for sensitive actions
- HTTPS in production
- private file storage with signed URLs
