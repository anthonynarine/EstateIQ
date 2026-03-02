# BuildingsPage Architecture (Enterprise Component Breakdown)

This document explains how `BuildingsPage.tsx` is structured after the refactor, how data flows through the feature module, and how each extracted component participates in the page.

---

## Location

- **Page orchestrator**
  - `src/features/buildings/pages/BuildingsPage.tsx`

- **Components**
  - `src/features/buildings/components/BuildingHeader.tsx`
  - `src/features/buildings/components/CreateBuildingForm.tsx`
  - `src/features/buildings/components/BuildingList.tsx`
  - `src/features/buildings/components/BuildingCard.tsx`
  - `src/features/buildings/components/Field.tsx`

- **Server state (TanStack Query)**
  - `src/features/buildings/queries/useBuildings.ts`

- **API client**
  - `src/features/buildings/api/buildingsApi.ts`
  - Central axios instance (Bearer + `X-Org-Slug` auto-injected)

---

## High-level idea

**`BuildingsPage.tsx` orchestrates.**  
It reads the `orgSlug`, calls query/mutation hooks, normalizes data into UI-friendly state, and composes presentational components.

**Extracted components are presentational** (no tenant logic, no direct server calls).  
They receive props and render UI only.

---

## Component tree

```text
BuildingsPage
├─ BuildingHeader
├─ (conditional) CreateBuildingForm
│  └─ Field (reused inputs)
└─ BuildingList
   └─ BuildingCard (for each building)
```

---

## Mermaid architecture diagram

> Paste this into any Mermaid renderer (GitHub supports Mermaid in Markdown).

```mermaid
flowchart TB
  subgraph Page[BuildingsPage.tsx (Orchestrator)]
    ORG[useOrg() -> orgSlug]
    Q[useBuildingsQuery(orgSlug)]
    M[useCreateBuildingMutation(orgSlug)]
    UI[UI State: isCreateOpen, form, formErrors]
    NORM[normalize DRF response + sort]
    SUB[handleSubmit -> validate + normalizeCreatePayload]
  end

  subgraph Components[Presentational Components]
    H[BuildingHeader.tsx]
    F[CreateBuildingForm.tsx]
    FLD[Field.tsx]
    L[BuildingList.tsx]
    C[BuildingCard.tsx]
  end

  subgraph ServerState[TanStack Query + API]
    AX[Axios client (Bearer + X-Org-Slug)]
    API[buildingsApi.ts (REST calls)]
    DRF[Django DRF (org-scoped via X-Org-Slug)]
  end

  ORG --> Q
  ORG --> M

  Q --> NORM --> L
  UI --> H
  UI --> F
  F --> FLD
  L --> C

  F --> SUB --> M

  Q --> AX --> API --> DRF
  M --> AX --> API --> DRF
```

---

## Responsibilities (enterprise contracts)

### `BuildingsPage.tsx` (Orchestrator)
Owns:
- Reading `orgSlug` from URL-driven org selection
- Calling:
  - `useBuildingsQuery(orgSlug)`
  - `useCreateBuildingMutation(orgSlug)`
- UI state:
  - `isCreateOpen`
  - `form` (UI strings, never `null`)
  - `formErrors`
- Validation (UI-only)
- Payload normalization (UI -> API):
  - convert `""` -> `null` for optional fields
- Normalizing DRF responses:
  - `Building[]` **or** `{ results: Building[] }`
- Sorting (stable list UX)

Does **not**:
- Render card layouts inline
- Contain full form JSX
- Make axios calls directly (must go through API layer + hooks)

---

### `BuildingHeader.tsx`
Props:
- `orgSlug`
- `isCreateOpen`
- `onToggleCreate`

Renders:
- Page title / subtitle
- Org context
- Create toggle button

No server-state logic.

---

### `CreateBuildingForm.tsx`
Props:
- `value: BuildingFormValue` *(UI strings only)*
- `errors` *(optional field-level error map)*
- `onChangeField(key, value)`
- `onSubmit` *(FormEvent handler)*
- `onCancel`
- `isSubmitting`
- `errorText`

Renders:
- Form layout
- Field-level inputs via `Field.tsx`
- Top-level submit/cancel controls
- Top-level error banner if needed

No mutation calls.

---

### `Field.tsx`
Reusable input component.

Props:
- `label`
- `value`
- `onChange(nextValue)`
- optional `placeholder`, `type`, `disabled`

Keeps input styling consistent across Buildings/Units/Leases.

---

### `BuildingList.tsx`
Props:
- `buildings`
- `isLoading`
- `isFetching`

Renders:
- Loading state (first load)
- Empty state (loaded, zero items)
- Count + “Refreshing…” indicator
- Grid of `BuildingCard`

No query calls.

---

### `BuildingCard.tsx`
Props:
- `building`

Renders:
- Building name
- Address display
- Lightweight actions placeholder (units link later)

No navigation, no mutations, no server state.

---

## Data flow details

### Read path (list)
1. `BuildingsPage` reads `orgSlug` from `useOrg()`.
2. `useBuildingsQuery(orgSlug)` fetches buildings (org-scoped via `X-Org-Slug`).
3. Page normalizes shape (`array` vs `results`) and sorts by name.
4. Page passes buildings to `BuildingList`.
5. `BuildingList` maps to `BuildingCard`.

### Write path (create)
1. User clicks “Create building” in `BuildingHeader`.
2. `BuildingsPage` sets `isCreateOpen = true`.
3. User edits fields -> `CreateBuildingForm` calls `onChangeField(key, value)`.
4. User submits -> `BuildingsPage.handleSubmit`:
   - validates required fields
   - normalizes UI strings -> API payload (`""` -> `null`)
   - calls `createMutation.mutateAsync(payload)`
5. Mutation invalidates the correct org-scoped query key (inside the hook).
6. Page resets form state and closes the form.

---

## Multi-tenant guarantees

- **Org selection is URL-driven** (`?org=<slug>`)
- axios client injects `X-Org-Slug` automatically
- query keys are org-scoped:
  - `["org", orgSlug, "buildings"]`

This prevents:
- cross-tenant cache bleed
- stale data between org switches
- accidental unscoped requests

---

## Next extension points

### Units (next module)
- Add route from `BuildingCard` → `BuildingDetailPage`
- Create:
  - `UnitList`, `CreateUnitForm`
  - Bulk unit creation endpoint (optional)
- Add server-side `units_count` (annotated) later for high-performance list cards

### Occupancy intelligence (later)
- `occupied_units_count` derived from active leases
- `vacant_units_count = units_count - occupied_units_count`

---

## Testing checklist (refactor safety)

- Create building works (mutation + invalidation)
- List loads and refreshes (query)
- Org switching does not leak cached data
- No manual refetch calls
- Page reload keeps auth + org selection stable
- All extracted components are presentational only

---
