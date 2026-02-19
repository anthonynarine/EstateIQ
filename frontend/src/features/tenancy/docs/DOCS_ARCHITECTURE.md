# Architecture — Tenancy + Leases Slice

## Layering rules

### 1) API Layer (`src/api/*`)
- Thin axios wrappers only
- No UI state
- No React imports

### 2) Server-state Layer (TanStack Query hooks)
- `src/features/tenancy/queries/*`
- Responsibilities:
  - stable `queryKey` boundaries
  - normalize paginated vs non-paginated responses
  - `enabled: Boolean(orgSlug)` to avoid 403 spam

### 3) Presentation Layer (Components)
- `src/features/tenancy/components/*`
- No network calls

### 4) Orchestration Layer (Pages)
- `src/features/tenancy/pages/*`
- Reads `orgSlug` + route params, runs queries/mutations, wires modals.

## Multi-tenant enforcement
All requests require:
- `Authorization: Bearer <access>`
- `X-Org-Slug: <orgSlug>`
