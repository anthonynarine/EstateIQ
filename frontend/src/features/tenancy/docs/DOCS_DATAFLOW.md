# Dataflow — Tenancy + Leases Slice

## Tenants
- TenantsPage -> useTenantsQuery(orgSlug, page, ordering) -> tenantsApi.listTenants -> table
- Create tenant -> mutation -> invalidate tenants query -> refresh list

## Unit Leases
- UnitLeasesPage -> useUnitLeasesQuery(orgSlug, unitId) -> leaseApi.listUnitLeases -> table
- UnitPicker -> useUnitsQuery(orgSlug) -> unitsApi.listUnits -> navigate to selected unit
- Create lease -> payload includes `parties: [{ tenant, role: "primary" }]` -> invalidate unit leases query
