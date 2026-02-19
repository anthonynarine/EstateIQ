# File Map — Tenancy + Leases Slice

## API layer (thin axios wrappers)

- `src/api/tenantsApi.ts`
- `src/api/leaseApi.ts` (or `src/api/leasesApi.ts`)
- `src/api/unitsApi.ts`
- `src/api/orgApi.ts` (needed for onboarding)

## Tenancy feature module

- `src/features/tenancy/types.ts`

### Queries (TanStack Query hooks)
- `src/features/tenancy/queries/useTenantsQuery.ts`
- `src/features/tenancy/queries/useUnitLeasesQuery.ts`
- `src/features/tenancy/queries/useCreateLeaseMutation.ts`
- `src/features/tenancy/queries/useUnitsQuery.ts`

### Components
- `src/features/tenancy/components/TenantsTable.tsx`
- `src/features/tenancy/components/TenantCreateModal.tsx`
- `src/features/tenancy/components/LeasesTable.tsx`
- `src/features/tenancy/components/LeaseCreateModal.tsx`
- `src/features/tenancy/components/UnitPicker.tsx`
- `src/features/tenancy/components/PageStateCard.tsx`

### Pages
- `src/features/tenancy/pages/TenantsPage.tsx`
- `src/features/tenancy/pages/UnitLeasesPage.tsx`

### Utilities
- `src/features/tenancy/utils/getHttpErrorHint.ts`

## Dashboard integration
- `src/pages/DashboardLayout.tsx`
- `src/pages/DashboardPage.tsx`
- `src/app/routes.tsx`

## Org (required for multi-tenant header)
- `src/org/OrgProvider.tsx`
- `src/org/OrgSwitcher.tsx`
- `src/org/useOrg.ts`
- `src/org/components/CreateOrgCard.tsx`
- `src/org/queries/useOrgsQuery.ts`
- `src/org/queries/useCreateOrgMutation.ts`
