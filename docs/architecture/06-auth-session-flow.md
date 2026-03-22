# 06. Auth and Session Flow

EstateIQ can support either standard Simple JWT or a central Auth API pattern.
This diagram shows a safe browser-session model.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth API / Backend
    participant MEM as In-Memory Access Token
    participant COOKIE as HttpOnly Refresh Cookie

    U->>FE: submit credentials
    FE->>API: POST /auth/login
    API-->>FE: access token + refresh cookie
    FE->>MEM: store access token in memory
    API->>COOKIE: set secure refresh cookie

    FE->>API: authenticated request with access token
    API-->>FE: response

    FE->>API: POST /auth/refresh
    COOKIE-->>API: refresh cookie automatically sent
    API-->>FE: new access token
    FE->>MEM: replace access token

    FE->>API: POST /auth/logout
    API-->>FE: revoke refresh token / blacklist
```

## Security posture

- Avoid storing refresh tokens in `localStorage`.
- Prefer secure, HttpOnly cookies for refresh.
- Keep access tokens short-lived.
- Apply rate limiting to login and refresh endpoints.
