# Users & Auth (PortfolioOS / EstateIQ)

This document describes the **identity + authentication foundation** for the PortfolioOS backend (Django + DRF), including the **custom user model**, **SimpleJWT** endpoints, and how this layer interacts with **multi-tenant org scoping**.

---

## Goals

- **Email-first authentication** (no username)
- **JWT for API clients** (React frontend)
- **Django Admin remains usable** (session auth for admin)
- **Tenant boundary stays in `apps.core`** (org membership is separate from user identity)
- **Secure defaults**: short access tokens, refresh rotation, blacklist after rotation
- **Future-friendly**: invites, email verification, 2FA, audit logging (later)

---

## Code Location

```
backend/apps/users/
  admin.py
  apps.py
  managers.py
  models.py
  serializers.py
  urls.py
  views.py
  migrations/
```

---

## Data Model

### `CustomUser` (apps.users)

**Why minimal?**
In a production SaaS, the user table should remain stable and free of app-specific fields. Tenant membership and domain data belong elsewhere.

**Fields**
- `email` (unique, indexed) — **login identifier**
- `first_name`, `last_name` (optional)
- `account_status` (`active` | `suspended`)
- Django standard: `is_active`, `is_staff`, `is_superuser`, etc.

**Key Properties**
- `is_suspended` — convenience gate for access control

**Tenant boundary rule**
> **Do not store org fields on the user model.**  
Org membership is managed by `apps.core.OrganizationMember`.

### `OrganizationMember` (apps.core)

`OrganizationMember.user` points to `settings.AUTH_USER_MODEL` (CustomUser).

This is the bridge between identity (users) and tenancy (core).

---

## Authentication

### JWT (SimpleJWT)

Configured in `config/settings/base.py`:

- Access token lifetime: **10 minutes**
- Refresh token lifetime: **14 days**
- `ROTATE_REFRESH_TOKENS=True`
- `BLACKLIST_AFTER_ROTATION=True`
- Blacklist app enabled: `rest_framework_simplejwt.token_blacklist`

This protects against refresh token replay and supports safe logout patterns.

---

## Endpoints

Base prefix: **`/api/v1/auth/`**

### 1) Register
**POST** `/api/v1/auth/register/`

Creates a user account only (no org membership created here).

**Request**
```json
{
  "email": "test@example.com",
  "password": "StrongPassw0rd!!",
  "first_name": "Test",
  "last_name": "User"
}
```

**Response**
```json
{
  "id": 1,
  "email": "test@example.com"
}
```

### 2) Token Obtain (Login)
**POST** `/api/v1/auth/token/`

**Request**
```json
{
  "email": "test@example.com",
  "password": "StrongPassw0rd!!"
}
```

**Response**
```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>"
}
```

### 3) Token Refresh
**POST** `/api/v1/auth/token/refresh/`

**Request**
```json
{ "refresh": "<jwt-refresh>" }
```

**Response**
```json
{ "access": "<new-jwt-access>" }
```

> With rotation enabled, the old refresh token is invalidated/blacklisted after use (depending on config).

### 4) Who Am I
**GET** `/api/v1/auth/me/`

**Headers**
- `Authorization: Bearer <access>`

Returns:
- minimal user identity
- the caller's **own memberships** (org + role list)

**Response**
```json
{
  "id": 1,
  "email": "test@example.com",
  "first_name": "Test",
  "last_name": "User",
  "account_status": "active",
  "memberships": [
    {
      "org_id": "…",
      "org_name": "Acme Properties LLC",
      "org_slug": "acme-properties",
      "role": "owner"
    }
  ]
}
```

**Suspended users**
If `account_status="suspended"`, `/me/` returns **403**.

---

## Tenant Scoping Interaction

### `X-Org-Slug` middleware (apps.core)

Your middleware sets `request.org` based on the header:

- `X-Org-Slug: <org-slug>`

This is used for domain routes (properties, ledger, etc).

### Why `/auth/me/` does **not** require `X-Org-Slug`

`/auth/me/` returns **identity-only** data and the user's own memberships.

It does **not** return org-owned domain objects, so it can be called safely without selecting an org.

### Rule for domain endpoints

For org-owned resources (properties, units, transactions, etc):

- Require `X-Org-Slug`
- Use `request.org`
- Enforce membership via `IsOrgMember`
- Filter querysets by `organization=request.org`

---

## Admin Compatibility

- Django Admin uses **session auth**, not JWT.
- The custom user admin (`CustomUserAdmin`) supports:
  - listing users by email
  - searching by name/email
  - suspending accounts via `account_status`

---

## Security Notes / Defaults

- Password validation uses Django validators via `validate_password()`.
- Tokens:
  - short access token reduces blast radius if leaked
  - refresh rotation + blacklist reduces replay risk
- Suspensions:
  - allows disabling access without deleting users (auditability)

---

## Migration Notes (AUTH_USER_MODEL)

### Best practice (early-stage / MVP)
If you are still early and can reset your local DB:

1. Ensure `AUTH_USER_MODEL = "users.CustomUser"` is set **before** migrating.
2. Delete `db.sqlite3` (local dev only).
3. Run:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

### If you already migrated with the default `auth.User`
Changing `AUTH_USER_MODEL` after migrations is painful.

Options:
- reset DB (preferred for MVP if no real data)
- controlled migration path (temporary FK + data migration) if data must be preserved

---

## Future Extensions (Planned)

- **Org invites** (email-based invite acceptance)
- **Email verification** (optional, policy-driven)
- **2FA** (TOTP, recovery codes)
- **Audit logging** (auth events, membership changes)
- **Device/session tracking** (optional)

---

## Quick Test Checklist

1. Register:
   - `POST /api/v1/auth/register/`
2. Login:
   - `POST /api/v1/auth/token/`
3. Fetch me:
   - `GET /api/v1/auth/me/` (Bearer token)
4. Verify tenant isolation:
   - domain endpoints should require `X-Org-Slug`
   - `/auth/me/` should never leak org domain objects
