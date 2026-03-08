# Tenants Feature — API & Backend Contract

Date: 2026-03-07

## Purpose

This document defines the intended backend and API contract for the **Tenants** feature in PortfolioOS / EstateIQ.

It is written to stop frontend/backend drift and to make the tenancy and leasing flow deterministic, testable, and safe for a multi-tenant SaaS.

This contract is aligned with the broader PortfolioOS architecture:

- Modular monolith with Django + DRF
- Organization-scoped querysets and services
- Lease-driven occupancy
- Thin views, service-layer business logic
- Minimal tenant data storage

---

## 1. Product and domain position

The Tenants feature belongs to the **leasing** domain.

At the product level, PortfolioOS explicitly treats **Tenants CRUD** and **Leases CRUD** as part of MVP leasing scope, with occupancy derived from the active lease rather than stored as a manual flag. The platform also emphasizes small-landlord workflows, mobile-friendly UX, and low cognitive load. Those goals directly affect the tenant API design. 

### Product implications

The tenant API should support these user jobs:

1. Create and maintain reusable tenant records.
2. Search tenants quickly by identity/contact info.
3. Launch lease creation from a tenant record.
4. Show current lease-derived residence context without duplicating state.
5. Preserve historical correctness by letting leases represent occupancy.

---

## 2. Core architectural rules

These rules are non-negotiable.

### Rule A — Org scoping is mandatory

All tenant and lease access must be scoped to an `Organization`. PortfolioOS architecture requires org-scoped querysets and service methods, and it treats multi-tenancy as a day-1 platform rule.

### Rule B — Tenant stays minimal

Privacy/compliance guidance explicitly recommends storing only what is needed for operation, including tenant name and contact information, while avoiding unnecessary sensitive data.

### Rule C — Occupancy is lease-driven

PortfolioOS architecture and product docs both say occupancy is derived from an active lease. A unit is occupied if it has an active lease. Avoid manual occupied flags and avoid storing duplicated “current residence” state on the tenant.

### Rule D — Views stay thin

Backend conventions and architecture guidance both recommend thin DRF views and service-layer business logic. Validation and lifecycle rules should not be scattered across views.

### Rule E — List endpoints must avoid N+1

Developer guidance explicitly calls for `select_related` / `prefetch_related` on list endpoints. Tenant directory endpoints must follow that rule.

---

## 3. Domain model contract

This document assumes the leasing-side model shape below.

```text
Organization
  └── Tenant
  └── Lease
        └── LeaseParty
              └── Tenant
```

### Canonical entities

#### Tenant
Stable identity/contact record.

Recommended fields:

- `id`
- `organization_id`
- `full_name`
- `email` nullable
- `phone` nullable
- `created_at`
- `updated_at`

Optional later:

- emergency contact
- notes
- soft-delete metadata

#### Lease
Assignment of a tenant party to a unit for a time period.

Core fields from the broader data model:

- `organization_id`
- `unit_id`
- `start_date`
- `end_date` nullable
- `rent_amount`
- `deposit_amount`
- `due_day`
- status derived from dates or managed lifecycle rules

#### LeaseParty
Join entity between lease and tenant.

Recommended fields:

- `lease_id`
- `tenant_id`
- `role` (`primary`, `co_tenant`)

### Important modeling rule

**Do not store these on Tenant as primary truth:**

- current building
- current unit
- current lease status
- move-in date

Those are derived from:

- active lease
- lease party join
- unit
- building

---

## 4. Backend validation contract

Validation should be enforced at multiple layers, with clear ownership.

### Serializer validation (required)

Serializer rules for create/update must enforce:

- `full_name` is required for create
- at least one contact method is required: `email` or `phone`
- blank strings should be normalized to `null` where appropriate
- whitespace-only values are invalid

### Service-layer validation (required)

Service layer should enforce the same business rule so non-HTTP entry points cannot bypass it.

Service methods should reject:

- tenant create without `full_name`
- tenant create/update with neither `email` nor `phone`

### Model `clean()` (optional but recommended)

Use `clean()` as a belt-and-suspenders safeguard if you want invariant protection for admin/scripts as well.

### Lease lifecycle validation

Recommended business rules:

- a **draft** lease may exist temporarily without tenant parties
- an **active** lease must have at least one tenant party
- a lease should have at most one `primary` party
- a unit can have at most one active lease at a time

The broader data model already defines the last rule explicitly.

---

## 5. API surface

Base API conventions for PortfolioOS define `/api/v1/` endpoints, JSON responses, and paginated list support chosen early in the system. For the Tenants feature, use **page-number pagination**.

### Recommended endpoints

```text
GET    /api/v1/tenants/
POST   /api/v1/tenants/
GET    /api/v1/tenants/{id}/
PATCH  /api/v1/tenants/{id}/
```

Later optional endpoints:

```text
GET    /api/v1/tenants/options/
GET    /api/v1/tenants/{id}/leases/
```

### Query params

All list/detail calls must support org scoping with:

```text
?org=<slug>
```

Tenant list should additionally support:

```text
?page=1
&page_size=12
&search=rebecca
```

---

## 6. List endpoint contract

### Endpoint

```http
GET /api/v1/tenants/?org=<slug>&page=1&page_size=12&search=rebecca
```

### Search behavior

Initial search scope:

- `full_name__icontains`
- `email__icontains`
- `phone__icontains`

That is enough for MVP.

Avoid broad building/unit search in phase 1 unless the query is backed by efficient annotations/prefetches.

### Pagination behavior

Use DRF `PageNumberPagination`.

Recommended defaults:

- default `page_size = 12`
- allow optional `page_size` override with sane max cap, e.g. 100

### Response shape

```json
{
  "count": 37,
  "next": "http://localhost:8000/api/v1/tenants/?org=fazie-inc&page=2&search=rebecca",
  "previous": null,
  "results": [
    {
      "id": 12,
      "full_name": "Rebecca Lalchan",
      "email": "rebecca@gmail.com",
      "phone": "555-555-554",
      "active_lease": null,
      "created_at": "2026-03-06T18:00:00Z",
      "updated_at": "2026-03-06T18:00:00Z"
    }
  ]
}
```

---

## 7. Tenant serializer contract

Use **separate serializers for separate jobs**.

### A. `TenantWriteSerializer`

Used for:

- `POST /tenants/`
- `PATCH /tenants/{id}/`

Recommended fields:

- `full_name`
- `email`
- `phone`

Rules:

- normalize blank strings to null
- validate required fields
- no derived residence state

### B. `TenantDirectorySerializer`

Used for:

- `GET /tenants/`

Recommended fields:

```json
{
  "id": 12,
  "full_name": "Rebecca Lalchan",
  "email": "rebecca@gmail.com",
  "phone": "555-555-554",
  "active_lease": {
    "id": 44,
    "status": "active",
    "start_date": "2026-01-01",
    "building": {
      "id": 3,
      "label": "12 Ocean View Drive"
    },
    "unit": {
      "id": 9,
      "label": "2A"
    }
  },
  "created_at": "2026-03-06T18:00:00Z",
  "updated_at": "2026-03-06T18:00:00Z"
}
```

### Why the nested `active_lease` object is better

- Keeps tenant identity separate from lease-derived context
- Prevents flattening a derived graph into the tenant root
- Scales cleanly if more directory metadata is added later
- Matches the product rule that residence is derived, not tenant-owned

---

## 8. Active lease summary contract

The directory should expose at most one derived **current** lease summary.

### `active_lease` structure

```json
{
  "id": 44,
  "status": "active",
  "start_date": "2026-01-01",
  "building": {
    "id": 3,
    "label": "12 Ocean View Drive"
  },
  "unit": {
    "id": 9,
    "label": "2A"
  }
}
```

### Null behavior

If the tenant has no active lease, return:

```json
"active_lease": null
```

Do not return fake empty strings.

### How to derive it

A tenant’s `active_lease` should be derived from:

1. lease-party rows involving that tenant
2. active lease lifecycle filter
3. lease → unit → building chain

This must be done efficiently using queryset helpers and prefetch/annotation patterns.

---

## 9. Backend implementation shape

Recommended Django app layout for leasing backend:

```text
backend/apps/leasing/
├── models.py
├── serializers.py
├── selectors.py
├── services.py
├── views.py
└── urls.py
```

### Responsibilities

#### `models.py`
Defines `Tenant`, `Lease`, `LeaseParty`, and constraints.

#### `serializers.py`
Contains:

- `TenantWriteSerializer`
- `TenantDirectorySerializer`
- lightweight nested serializers for active lease summary

#### `selectors.py`
Owns efficient query composition.

Recommended selector examples:

- `tenant_directory_qs(org, search=None)`
- `tenant_detail_qs(org)`

`tenant_directory_qs()` should:

- org-scope first
- apply search filters
- prefetch/annotate active lease summary efficiently
- avoid N+1

#### `services.py`
Owns mutation business rules.

Recommended service examples:

- `create_tenant(...)`
- `update_tenant(...)`
- future `attach_tenant_to_lease(...)`

#### `views.py`
Thin DRF viewset.

Responsibilities:

- resolve org from request/query/header rules
- use scoped querysets
- pick serializer by action
- delegate business mutations to service layer

---

## 10. DRF viewset contract

### Recommended viewset behavior

```python
class TenantViewSet(ModelViewSet):
    permission_classes = [IsOrgMember]
    pagination_class = TenantPagination

    def get_queryset(self):
        org = resolve_org(self.request)
        search = self.request.query_params.get("search", "")
        return tenant_directory_qs(org=org, search=search)

    def get_serializer_class(self):
        if self.action in ["list"]:
            return TenantDirectorySerializer
        return TenantWriteSerializer

    def perform_create(self, serializer):
        org = resolve_org(self.request)
        create_tenant(org=org, **serializer.validated_data)
```
```

### Notes

- Keep `resolve_org()` centralized
- Never return unscoped querysets
- Keep serializer selection explicit
- Prefer service calls over embedding rules directly in views

---

## 11. Error contract

The global API contracts document recommends a consistent error envelope.

Recommended tenant validation response:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Tenant data is invalid",
    "details": {
      "full_name": ["This field is required."],
      "non_field_errors": ["Provide at least one contact method: email or phone."]
    }
  }
}
```

If the project is still using standard DRF field errors for now, that is acceptable in development, but the frontend should move toward a normalized shape over time.

---

## 12. Frontend-to-backend contract alignment

The current frontend work has been moving toward a paginated directory workspace with:

- URL-backed `page`
- URL-backed `search`
- org-scoped cache keys
- `TenantCard` rendering from a `Tenant` object
- hidden-by-default create flow

To support that correctly, the backend contract must provide:

1. paginated list envelope
2. stable `TenantDirectorySerializer`
3. optional nested `active_lease`
4. deterministic validation errors

### Frontend request contract

```http
GET /api/v1/tenants/?org=fazie-inc&page=1&page_size=12&search=Rebecca
```

### Frontend create contract

```http
POST /api/v1/tenants/?org=fazie-inc
Content-Type: application/json

{
  "full_name": "Rebecca Lalchan",
  "email": "rebecca@gmail.com",
  "phone": "555-555-554"
}
```

### Frontend update contract

```http
PATCH /api/v1/tenants/12/?org=fazie-inc
Content-Type: application/json

{
  "phone": "555-000-0000"
}
```

---

## 13. Tenant-driven lease launch contract

The frontend tenant directory already uses the mental model:

```text
Tenant -> Create Lease -> Assign Building/Unit -> Save Lease
```

### Recommended route contract

```text
/dashboard/leases/new?org=<slug>&tenantId=<id>
```

### Backend implication

Lease create API should support a payload with parties/tenant references.

Recommended lease create body:

```json
{
  "unit_id": 9,
  "start_date": "2026-04-01",
  "end_date": null,
  "rent_amount": "1800.00",
  "deposit_amount": "1800.00",
  "due_day": 1,
  "parties": [
    {
      "tenant_id": 12,
      "role": "primary"
    }
  ]
}
```

### Required lease rule

If lease status becomes `active`, at least one party must exist.

---

## 14. Query performance contract

Tenant directory endpoint must be safe for real usage.

### Minimum performance rules

- org-scope first
- search on indexed or reasonably cheap text columns
- `select_related` / `prefetch_related` for active lease/unit/building graph
- no per-row lease lookup in Python loops
- add appropriate indexes for frequent org and created-at access

Broader platform docs recommend indexes such as `(org_id, created_at)` and org hot-filter indexing across tables.

### Recommended future indexes

- `Tenant(organization_id, created_at)`
- `Tenant(organization_id, full_name)` if search volume becomes meaningful
- `Lease(organization_id, unit_id, status)` or equivalent lifecycle support
- `LeaseParty(tenant_id, lease_id)`

---

## 15. Security and privacy contract

Because the feature handles personal tenant data, backend rules should follow the privacy document:

- store only needed tenant identity/contact data
- avoid SSNs and unnecessary government IDs
- enforce org isolation
- respect role-based access
- use TLS and encrypted-at-rest infrastructure standards

### Additional tenant feature recommendations

- audit log create/update/delete tenant mutations
- redact sensitive values from logs if logs become structured/evented
- avoid exposing tenants across org boundaries in autocomplete or search

---

## 16. Test plan (backend)

Minimum backend tests for this feature:

### Org scoping

- tenant list returns only current org tenants
- tenant detail returns 404 for cross-org record
- tenant update cannot modify cross-org record

### Validation

- create fails without `full_name`
- create fails when both `email` and `phone` are blank
- create succeeds when only email is present
- create succeeds when only phone is present
- patch preserves valid invariants

### Pagination/search

- list returns paginated envelope
- search filters by full name
- search filters by email
- search filters by phone

### Active lease summary

- `active_lease` is null when no active lease exists
- `active_lease` contains building/unit summary when active lease exists
- ended leases do not show as active summary

### Lease integrity

- cannot activate a lease with no parties
- cannot create overlapping active leases for same unit

---

## 17. Sequence diagrams

### A. Tenant directory list

```text
Browser
  |
  | GET /dashboard/tenants?org=fazie-inc&page=1&search=rebecca
  v
React TenantsPage
  |
  | useTenantsQuery({ orgSlug, page, search })
  v
GET /api/v1/tenants/?org=fazie-inc&page=1&page_size=12&search=rebecca
  v
DRF TenantViewSet
  |
  | resolve org
  | build tenant_directory_qs(org, search)
  | paginate
  | serialize TenantDirectorySerializer
  v
Paginated JSON response
  v
TenantDirectorySection -> TenantCard[]
```

### B. Create tenant

```text
User
  |
  | fills CreateTenantForm
  v
TenantsPage
  |
  | useCreateTenantMutation
  v
POST /api/v1/tenants/?org=fazie-inc
  v
TenantWriteSerializer
  |
  | validate full_name
  | validate email or phone
  v
create_tenant(service)
  v
Tenant saved
  v
201 response
  v
Frontend invalidates tenantQueryKeys.org(orgSlug)
  v
Directory refetches
```

### C. Tenant-driven lease launch

```text
User clicks "Create Lease"
  v
TenantsPage
  |
  | navigate /dashboard/leases/new?org=fazie-inc&tenantId=12
  v
Lease create page
  |
  | tenant preselected
  | user selects building/unit
  | user submits lease + parties
  v
POST /api/v1/leases/?org=fazie-inc
  v
Lease service validates
  |
  | unit belongs to org
  | no overlapping active lease
  | active lease has tenant party
  v
Lease + LeaseParty saved
```

---

## 18. Current gap analysis

Based on the current uploaded project artifacts and ongoing tenant feature work, these are the likely drift areas to close:

1. frontend code has existed in both flat-list and paginated forms
2. tenant directory section props changed during refactor
3. old imports/paths existed during the restructure
4. backend list contract should be upgraded from minimal `results` handling to full paginated envelope
5. tenant serializer should evolve to include lease-derived `active_lease` summary
6. tenant create/edit validation must be enforced on backend, not only in UI

This document is the target contract to align those moving pieces.

---

## 19. Recommended next backend implementation order

1. Add/confirm `TenantWriteSerializer` validation
2. Add `TenantPagination`
3. Add `tenant_directory_qs(org, search)` selector
4. Add `TenantDirectorySerializer` with nested `active_lease`
5. Update `TenantViewSet` list/create/update flows
6. Add backend tests for org scoping, validation, and active lease summary
7. Then wire lease-create enforcement for active-party rules

---

## 20. Definition of done for this contract

The backend contract is “done” when:

- tenant list is paginated and searchable
- tenant create/update validation is enforced server-side
- tenant directory list returns lease-derived active summary
- all tenant endpoints are org-scoped
- list endpoint avoids N+1
- lease-driven occupancy remains the source of truth
- frontend and backend payloads match without ad hoc transforms

---

## Appendix — Recommended tenant JSON types

### Tenant write payload

```json
{
  "full_name": "Rebecca Lalchan",
  "email": "rebecca@gmail.com",
  "phone": "555-555-554"
}
```

### Tenant directory item

```json
{
  "id": 12,
  "full_name": "Rebecca Lalchan",
  "email": "rebecca@gmail.com",
  "phone": "555-555-554",
  "active_lease": {
    "id": 44,
    "status": "active",
    "start_date": "2026-01-01",
    "building": {
      "id": 3,
      "label": "12 Ocean View Drive"
    },
    "unit": {
      "id": 9,
      "label": "2A"
    }
  },
  "created_at": "2026-03-06T18:00:00Z",
  "updated_at": "2026-03-06T18:00:00Z"
}
```

### Paginated tenant response

```json
{
  "count": 37,
  "next": "http://localhost:8000/api/v1/tenants/?org=fazie-inc&page=2",
  "previous": null,
  "results": [
    {
      "id": 12,
      "full_name": "Rebecca Lalchan",
      "email": "rebecca@gmail.com",
      "phone": "555-555-554",
      "active_lease": null,
      "created_at": "2026-03-06T18:00:00Z",
      "updated_at": "2026-03-06T18:00:00Z"
    }
  ]
}
```
