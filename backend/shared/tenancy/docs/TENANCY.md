# Tenancy (Organization Isolation)

EstateIQ is multi-tenant. A tenant is an **Organization**. Every request must resolve **which org** the user is operating in, and every data access must be scoped to that org.

This doc explains two foundational building blocks:

- `OrganizationResolutionMiddleware` (request → org resolution)
- `OrgScopedQuerySet` / `OrgScopedManager` (org-scoped data access helpers)

---

## 1) `OrganizationResolutionMiddleware`

**Goal:** Attach an Organization to every incoming request as `request.org`.

### What it does
- Reads the org identifier from the request (MVP: `X-Org-Slug` header).
- Looks up the active `Organization` row.
- Sets:
  - `request.org` → the resolved `Organization` or `None`
  - `request.org_resolution_source` → debug metadata (e.g. `header`, `missing_header`, `org_not_found`)

### Why it matters
- Creates a single, consistent tenant boundary for downstream layers:
  - DRF permissions (e.g. “user must be an active org member”)
  - Query filtering (every queryset must be org-scoped)
  - Audit logging context (“who did what in which org?”)

### MVP resolution strategy
- **Header-based**: `X-Org-Slug: <org-slug>`
- This is simple for local dev and early MVP.

### Production upgrades (later)
- Resolve org from subdomain (`acme.portfolioos.com`)
- Resolve org from JWT claims (`org_id`) for API-to-API calls
- Require org presence for all `/api/*` routes except onboarding/auth

---

## 2) `OrgScopedQuerySet` and `OrgScopedManager`

**Goal:** Provide a safe, reusable pattern for scoping database queries to the current org.

### What it does
- `OrgScopedQuerySet.for_org(organization)`:
  - If `organization` is `None`, returns `.none()` (deny-by-default)
  - Otherwise returns `filter(organization=organization)`
- `OrgScopedManager.for_org(organization)`:
  - Convenience wrapper that returns an org-scoped queryset

### Why it matters
- Prevents accidental cross-tenant data access by making the “safe” way the “easy” way.
- Encourages consistent patterns across all domain apps:
  - `properties` (buildings/units)
  - `leasing` (tenants/leases)
  - `billing` (charges/payments/allocations)
  - `reporting`, `ai`, etc.

### Typical usage pattern (example)
- Every org-owned model includes: `organization = ForeignKey(Organization, ...)`
- Set `objects = OrgScopedManager()` on the model
- In services/views:
  - `Building.objects.for_org(request.org)` instead of `Building.objects.all()`

---

## Tenant Safety Rules (Non-negotiable)

1. **Every org-owned model has `organization` FK** (or is only reachable through an org-owned parent, but FK is preferred).
2. **Every API endpoint that reads/writes org data requires:**
   - `request.org` resolved
   - authenticated user
   - active `OrganizationMember` in that org
3. **Deny-by-default**:
   - If org can’t be resolved, return 403/404 (depending on endpoint policy), and querysets return `.none()`.

---

## Files

- `shared/tenancy/middleware.py`
- `shared/tenancy/querysets.py`
