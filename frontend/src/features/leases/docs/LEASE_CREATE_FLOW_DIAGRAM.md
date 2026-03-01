# Create Lease Flow — Architecture Diagram (UI + Data Flow)

This doc explains how the **Create Lease** experience is orchestrated in the frontend, from **UI components** → **state hooks** → **TanStack Query mutations** → **Django DRF API**.

> **Scope:** current refactor state (select existing tenant only).  
> **Next phase:** inline “create tenant” mode (POST tenant → POST lease) will extend the same architecture.

---

## Component Orchestration (UI Tree)

```mermaid
flowchart TB
  subgraph LeasesFeature["src/features/leases"]
    CreateLeaseForm["forms/CreateLeaseForm.tsx\n(orchestrator)"]
    UseCreateLeaseForm["forms/useCreateLeaseForm.ts\n(state + validation + payload)"]
    LeaseTermsFields["forms/LeaseTermsFields.tsx\n(presentational inputs)"]
    TenantSection["forms/TenantSection.tsx\n(presentational boundary)"]
    TenantSelect["features/tenants/components/TenantSelect.tsx\n(directory picker)"]
    FormActions["forms/FormActions.tsx\n(presentational actions)"]
    FormErrorSummary["forms/FormErrorSummary.tsx\n(form-level errors)"]
    FieldError["forms/FieldError.tsx\n(field-level errors)"]
  end

  CreateLeaseForm --> UseCreateLeaseForm
  CreateLeaseForm --> FormErrorSummary
  CreateLeaseForm --> TenantSection
  CreateLeaseForm --> LeaseTermsFields
  CreateLeaseForm --> FormActions

  TenantSection --> TenantSelect
  LeaseTermsFields --> FieldError
```

---

## Data Flow (System Thinking)

### High-level flow

```mermaid
flowchart LR
  UI["User fills form\n(CreateLeaseForm UI)"] --> Hook["useCreateLeaseForm\nvalidate() + buildPayload()"]
  Hook -->|payload| Mutation["useCreateLeaseMutation\n(TanStack Query)"]
  Mutation -->|POST| API["Django DRF\n/leases/"]
  API -->|200 Created| Mutation
  Mutation -->|invalidate queries| Cache["Query Cache\n(org-scoped keys)"]
  Mutation --> UI
```

### Sequence: Submit (current behavior)

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant F as CreateLeaseForm.tsx
  participant H as useCreateLeaseForm.ts
  participant M as useCreateLeaseMutation.ts
  participant A as axios(api client)
  participant S as Django DRF API

  U->>F: Click "Add lease" (open)
  U->>F: Fill dates/rent + select tenant (optional)
  U->>F: Click "Create lease"
  F->>H: validate()
  H-->>F: ok / localError
  F->>H: buildPayload()
  H-->>F: payload (DRF-ready)
  F->>M: mutateAsync(payload)
  M->>A: POST /leases/ (auth + X-Org-Slug)
  A->>S: HTTP request
  S-->>A: 201 Created or 4xx validation error
  A-->>M: response/error
  M-->>F: success or error
  F->>F: on success: reset() + close
  F->>F: on error: formatApiFormErrors -> FormErrorSummary/FieldError
  M->>M: invalidate org-scoped queries
```

---

## Error Handling (Single UX Surface)

Errors are normalized once and then rendered consistently:

```mermaid
flowchart TB
  Err["Axios Error (unknown shape)"] --> Normalize["formatApiFormErrors(error)\n-> { formErrors, fieldErrors }"]
  Normalize --> Form["FormErrorSummary\n(formErrors)"]
  Normalize --> Fields["FieldError\n(fieldErrors[field])"]
```

**Rules:**
- **401** becomes: _“Session expired, please log in again.”_
- Field errors display under the matching control (e.g., `rent_amount`, `start_date`)
- Non-field errors display in the summary banner (`detail`, `non_field_errors`, `_error`)

---

## Tenant Attachment Logic (Current)

Tenant selection is optional today. When selected, the lease payload includes:

```json
{
  "parties": [{ "tenant_id": 123, "role": "primary" }]
}
```

```mermaid
flowchart LR
  TenantSelect -->|"tenant_id"| CreateLeaseForm
  CreateLeaseForm -->|"parties=[{tenant_id, role}]\n(if tenant selected)"| LeasePayload
```

---

## Domain Entity Diagram (Conceptual)

This is the conceptual relationship model relevant to creating a lease:

```mermaid
erDiagram
  ORGANIZATION ||--o{ BUILDING : owns
  BUILDING ||--o{ UNIT : contains
  ORGANIZATION ||--o{ TENANT : has
  ORGANIZATION ||--o{ LEASE : has
  UNIT ||--o{ LEASE : "leases"
  LEASE ||--o{ LEASE_PARTY : includes
  TENANT ||--o{ LEASE_PARTY : participates

  ORGANIZATION {
    int id
    string slug
  }

  BUILDING {
    int id
    int organization_id
    string name
  }

  UNIT {
    int id
    int building_id
    string label
  }

  TENANT {
    int id
    int organization_id
    string full_name
    string email
    string phone
  }

  LEASE {
    int id
    int organization_id
    int unit_id
    date start_date
    date end_date
    decimal rent_amount
    decimal security_deposit_amount
    int rent_due_day
    string status
  }

  LEASE_PARTY {
    int id
    int lease_id
    int tenant_id
    string role
  }
```

---

## Org Safety Guarantees

**Multi-tenant safety is enforced at multiple layers:**
- Query keys are org-scoped (e.g., `["org", orgSlug, "tenants"]`)
- Axios client attaches `X-Org-Slug` on every request (single shared client)
- Mutations are initialized with `orgSlug` and must be called from an org-scoped context

---

## Next Step (Planned Extension)

Inline tenant creation extends the same architecture, without changing the UX (“one submit button”):

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant F as CreateLeaseForm
  participant H as useCreateLeaseWithTenant (new)
  participant T as tenantsApi (POST /tenants)
  participant L as leaseApi (POST /leases)
  participant S as Django DRF API

  U->>F: Submit "Create lease"
  F->>H: submit(mode, tenantDraft, leaseDraft)
  alt mode = create tenant
    H->>T: POST /tenants
    T->>S: create tenant
    S-->>T: tenant
    H->>L: POST /leases (parties references tenant)
  else mode = select tenant
    H->>L: POST /leases (parties references selected tenant)
  end
  L->>S: create lease
  S-->>L: lease
  H-->>F: success -> reset + invalidate
```

---

## Files & Responsibilities

| File | Role |
|---|---|
| `forms/CreateLeaseForm.tsx` | Orchestrator: open/close, submit pipeline, renders sections |
| `forms/useCreateLeaseForm.ts` | State + validation + payload builder |
| `forms/TenantSection.tsx` | Tenant boundary (select now; select/create later) |
| `tenants/components/TenantSelect.tsx` | Tenant directory picker (query-driven) |
| `forms/LeaseTermsFields.tsx` | Lease inputs + field errors |
| `forms/FormActions.tsx` | Submit/cancel + pending UI |
| `forms/FormErrorSummary.tsx` | Form-level error banner |
| `forms/FieldError.tsx` | Field-level error rendering |
| `queries/useCreateLeaseMutation.ts` | TanStack Query mutation + invalidation |
| `api/formatApiFormerrors.ts` | Canonical DRF/Axios error normalization |

---

### Tip for GitHub rendering
GitHub supports Mermaid in Markdown. If you ever view this in a renderer that doesn’t, use a Mermaid-enabled viewer (or GitHub itself).

