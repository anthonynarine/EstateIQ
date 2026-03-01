# TenantSection Orchestration (Entity-Style Diagram)

EstateIQ — Create Lease Flow (Tenant selection + inline tenant create)

---

## What this module does

`TenantSection` is the **tenant selection boundary** inside `CreateLeaseForm`.

It supports:

- **Select existing tenant** (pick a tenant already in the org)
- **Create new tenant inline** (enter draft info, later orchestrated into a create-then-lease flow)

**Rule:** UI components never sequence API calls. Sequencing lives in a hook/service.

---

## Component Entities (ER-style)

> Think of each component like an “entity”: it has **inputs (props)**, **outputs (events)**, and **owned state (if any)**.

```mermaid
erDiagram
  CREATE_LEASE_FORM ||--|| USE_CREATE_LEASE_FORM : "uses"
  CREATE_LEASE_FORM ||--|| TENANT_SECTION : "renders"
  TENANT_SECTION ||--|| TENANT_MODE_TOGGLE : "renders"
  TENANT_SECTION ||--o{ TENANT_SELECT_PANEL : "renders when mode=select"
  TENANT_SECTION ||--o{ TENANT_CREATE_PANEL : "renders when mode=create"

  TENANT_SELECT_PANEL ||--|| TENANT_SELECT : "wraps"
  TENANT_SELECT ||--|| USE_TENANTS_QUERY : "calls"

  USE_CREATE_LEASE_FORM ||--|| TENANT_STATE : "owns"
  USE_CREATE_LEASE_FORM ||--|| LEASE_STATE : "owns"
  USE_CREATE_LEASE_FORM ||--|| VALIDATION_STATE : "owns"

  TENANT_STATE {
    string tenantMode "select | create"
    string primaryTenantId "nullable"
    object tenantCreateDraft "name/email/phone"
  }

  LEASE_STATE {
    string unitId
    string startDate
    string endDate "nullable"
    number rentAmount
    number depositAmount "nullable"
    number dueDay
  }

  VALIDATION_STATE {
    object tenantCreateFieldErrors
    object leaseFieldErrors
    string formError "non-field"
  }

  USE_TENANTS_QUERY {
    string orgSlug
    list tenants
    bool isLoading
    bool isFetching
    error error
  }

  CREATE_LEASE_FORM {
    string orgSlug
    string unitId
    fn onSubmit()
  }

  TENANT_SECTION {
    string orgSlug
    string tenantMode
    string primaryTenantId
    object tenantCreateDraft
    fn onChangeMode(mode)
    fn onSelectTenant(id)
    fn onChangeDraft(patch)
  }

  TENANT_MODE_TOGGLE {
    string value "select | create"
    fn onChange(mode)
  }

  TENANT_SELECT {
    string orgSlug
    string value "tenantId"
    fn onChange(tenantId)
  }

  TENANT_CREATE_PANEL {
    object value "draft"
    object errors
    fn onChange(patch)
  }
```

---

## Responsibility Boundaries (who owns what)

### `CreateLeaseForm` (orchestrator of the whole lease workflow)
Owns:

- the **submit button**
- the **lease mutation**
- error mapping (API → field errors)
- the *future* “create tenant then create lease” sequencing

Does **not**:
- render tenant inputs directly (delegates to `TenantSection`)

### `TenantSection` (tenant UI orchestrator)
Owns:

- mode switching UI
- choosing which panel to render
- pushing events upward (`onSelectTenant`, `onChangeDraft`, `onChangeMode`)

Does **not**:
- call APIs
- create tenants
- create leases

### Panels (presentational + small glue)
- `TenantModeToggle`: pure UI
- `TenantSelectPanel` / `TenantSelect`: fetch + select behavior (org scoped)
- `TenantCreatePanel`: draft field UI + error display

---

## Data flow: selection + draft updates

```mermaid
sequenceDiagram
  participant U as User
  participant TS as TenantSection
  participant F as useCreateLeaseForm (state)
  participant Q as useTenantsQuery (server)

  U->>TS: toggle mode (select/create)
  TS->>F: setTenantMode(mode)

  alt mode = select
    TS->>Q: fetch tenants (orgSlug)
    Q-->>TS: tenants[]
    U->>TS: pick tenant
    TS->>F: setPrimaryTenantId(tenantId)
  else mode = create
    U->>TS: type tenant fields
    TS->>F: patchTenantCreateDraft({ ... })
  end
```

---

## Submit orchestration (Phase B: create-then-lease)

Right now, your UI is set up for this cleanly.

When you implement `useCreateLeaseWithTenant()`, the submit sequence becomes:

```mermaid
sequenceDiagram
  participant U as User
  participant CLF as CreateLeaseForm
  participant S as useCreateLeaseWithTenant (service hook)
  participant API as Backend API

  U->>CLF: click "Create lease"
  CLF->>S: submit({ tenantMode, primaryTenantId, tenantCreateDraft, leaseFields })

  alt tenantMode = select
    S->>API: POST /leases (tenant_id)
    API-->>S: lease
  else tenantMode = create
    S->>API: POST /tenants (draft)
    API-->>S: tenant.id
    S->>API: POST /leases (tenant.id)
    API-->>S: lease
  end

  S-->>CLF: success (navigate / show toast)
```

**Key point:** `TenantSection` stays ignorant of sequencing.

---

## Why this is “enterprise-grade”

- **Deterministic orchestration:** submit sequencing is centralized in a service hook.
- **Hard presentation boundary:** tenant UI cannot accidentally create records.
- **Multi-tenant safe by design:** tenant queries require `orgSlug`, and mutations are executed only at the form boundary.
- **Testability:** you can unit-test orchestration without rendering UI.

---

## Testing targets

### Unit tests (most valuable)
- `useCreateLeaseForm`: validation + payload building
- `useCreateLeaseWithTenant`: sequencing rules + error handling

### Component tests
- `TenantSection` switches panels correctly
- `TenantCreatePanel` displays field errors
- `TenantSelect` shows loading / empty states

---

## Extension roadmap

- tenant autocomplete (debounced search)
- duplicate detection (email/phone)
- “Create tenant” modal variant (swap UI only)
- multi-party leases (add co-tenant selection)

---

## Architectural mantra

**TenantSection is a presentation boundary.**  
**CreateLeaseForm owns sequencing.**  
**Ledger correctness stays deterministic elsewhere.**
