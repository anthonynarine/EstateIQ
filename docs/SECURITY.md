# Security — PortfolioOS

Date: 2026-02-13

This document defines security standards for a multi-tenant SaaS handling financial data.

---

## Threat model (high-level)

Risks:
- Cross-tenant data leakage (highest priority)
- Credential stuffing / brute force login
- XSS leading to token theft
- CSRF (if cookies are used)
- Insecure file uploads (receipts/leases)
- Insider misuse (need audit logs)

---

## Non-negotiables

1. **Tenant isolation**
   - Every API access is scoped to Organization
   - Queries must never return data outside the org
2. **Least privilege**
   - Roles: owner, manager, accountant, read-only
   - Default role is least privileged possible
3. **Audit logging**
   - Record create/update/delete and sensitive actions
4. **HTTPS only in production**
5. **Secure file handling**
   - Virus scanning (Phase 2)
   - Signed URLs for downloads
   - Private bucket policies

---

## Authentication options

### Option A: Simple JWT (DRF SimpleJWT)
Safe if implemented properly:
- Access token: 5–15 minutes
- Refresh token: rotating
- Blacklist on logout
- Rate-limit login + refresh
- Store refresh token in **HttpOnly Secure cookie**
- Use CSRF protection if cookies are used

### Option B: Central Auth API
Recommended if you have multiple apps:
- App verifies JWT with Auth API (signature + claims, or introspection)
- Central revocation and session management

Both are acceptable. Choose based on whether you need SSO across multiple products.

---

## Token storage guidance (frontend)

Avoid storing refresh tokens in `localStorage`.
Preferred patterns:
- HttpOnly refresh cookie + in-memory access token
- If access token is stored client-side, use memory and refresh on demand

---

## Authorization

### Org scoping (mandatory)
- Every request resolves `request.org`
- Every queryset is filtered by `org_id`
- Add tests ensuring no cross-org access

### Role enforcement
- DRF permissions per endpoint:
  - owner: everything
  - manager: leases, payments, tickets
  - accountant: expenses, reporting, exports
  - read-only: view dashboards only

---

## Rate limiting & abuse prevention

- Limit `/auth/login`, `/auth/refresh`
- Lockout or exponential backoff for repeated failures
- Basic bot protection on signup (if public signups exist)

---

## Data handling

- Encrypt at rest (managed DB or disk encryption)
- Enforce strong password policies
- Store minimal sensitive PII; avoid SSNs
- Mask sensitive data in logs

---

## File uploads

- Validate file types and size
- Store in private buckets
- Serve via signed URLs
- Strip metadata from images (Phase 2)

---

## Security testing checklist

- Unit tests for org scoping
- Permission tests per role
- Static analysis (bandit for Python, eslint for JS)
- Dependency scanning (pip-audit/npm audit)
- OWASP top 10 pass
