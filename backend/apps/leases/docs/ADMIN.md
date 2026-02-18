# 05 — Admin

The Leases app includes admin registrations for:

- Tenant (search + filters)
- Lease (inline LeaseTenant join rows)
- LeaseTenant (search + filters)

Recommended admin behaviors:

- list_display includes `organization` to debug tenant isolation quickly
- search_fields include name/email/phone for tenant lookups
- Lease admin inline enables quick viewing/editing of parties
