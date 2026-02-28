# 🏢 EstateIQ --- Lease Feature (Enterprise Architecture Documentation)

## Overview

The Lease Feature is a core domain module within EstateIQ.\
It governs lease lifecycle management, enforces organizational
boundaries, maintains business invariants, and deterministically drives
occupancy state.

This feature is built using:

-   Backend: Django + Django REST Framework
-   Architecture: Service Layer (domain logic separated from
    serializers)
-   Frontend: React + Vite + TanStack Query
-   Auth: JWT (org-scoped via request.org middleware)
-   Data Integrity: Transactional updates + domain validation

------------------------------------------------------------------------

# 1️⃣ Domain Responsibilities

The Lease module is responsible for:

• Creating leases\
• Editing leases (PATCH-safe semantics)\
• Enforcing one active lease per unit\
• Preventing overlapping lease ranges\
• Managing lease parties (tenants)\
• Driving occupancy state\
• Maintaining org isolation

------------------------------------------------------------------------

# 2️⃣ Data Model (Backend)

    Organization
       └── Building
             └── Unit
                   └── Lease
                          └── LeaseParty

### Lease Fields

-   organization (FK)
-   unit (FK)
-   start_date
-   end_date (nullable)
-   rent_amount
-   security_deposit_amount (nullable)
-   rent_due_day
-   status (draft \| active \| ended)

### Core Invariants

1.  Lease must belong to same org as unit.
2.  Only one ACTIVE lease per unit at a time.
3.  Active leases must not overlap date ranges.
4.  Unit reassignment during update is restricted and validated.
5.  Occupancy is derived, never manually set.

------------------------------------------------------------------------

# 3️⃣ Service Layer Design

All business logic lives in:

    apps/leases/services.py

Primary functions:

-   create_lease()
-   update_lease()

### PATCH Semantics

`update_lease()` supports partial updates:

-   Fields omitted remain unchanged.
-   Explicit nulls supported for end_date and deposit.
-   Org integrity enforced.
-   Transaction.atomic ensures safe writes.

This allows DRF partial_update() to work correctly.

------------------------------------------------------------------------

# 4️⃣ Serializer Design

Serializer delegates to service layer:

    LeaseSerializer.update()

Responsibilities:

• Extract nested parties\
• Default unit to instance.unit\
• Pass sentinel values for explicit null support\
• Enforce org scoping

Serializer does not contain business rules.

------------------------------------------------------------------------

# 5️⃣ Frontend Architecture

Location:

    src/features/leases/

Component Tree (Lease Flow):

    App
     └── DashboardLayout
          └── BuildingDetailPage
               └── UnitDetailPage
                    ├── CurrentLeaseSummary
                    │     └── LeaseCard
                    │           └── EditLeaseModal
                    ├── CreateLeaseForm
                    └── LeaseHistoryList

------------------------------------------------------------------------

# 6️⃣ Occupancy Computation

Occupancy is derived from:

    getUnitOccupancyStatus(leases, todayISO)

Rules:

-   Active + in-range lease → Occupied
-   Otherwise → Vacant

No manual occupancy toggles exist in system.

------------------------------------------------------------------------

# 7️⃣ Business Rule Enforcement

The system enforces:

### Rule 1 --- Single Active Lease

No unit may have more than one lease with status="active" overlapping
today.

### Rule 2 --- No Overlapping Ranges

Date ranges cannot overlap with another active lease.

### Rule 3 --- Org Boundary

Lease.organization must match request.org.

### Rule 4 --- Immutable Org

Lease cannot be reassigned to another org.

------------------------------------------------------------------------

# 8️⃣ Error Handling Strategy

Backend:

-   Raises ValueError for domain violations.
-   DRF converts to 400 responses.
-   500 errors indicate unexpected internal logic issues.

Frontend:

-   TanStack Query handles mutation errors.
-   Modal displays controlled error state.
-   No raw stack traces shown to user.

------------------------------------------------------------------------

# 9️⃣ Enterprise Principles Applied

• Deterministic state derivation\
• Service-layer domain isolation\
• Transactional safety\
• Explicit null support\
• Multi-tenant isolation\
• Clear component boundaries\
• Predictable mutation flow

------------------------------------------------------------------------

# 🔟 Future Enhancements

-   Ledger integration (automatic rent posting)
-   Lease amendment tracking
-   Lease versioning (audit history)
-   Automated rent escalation logic
-   Expiration alerts
-   Role-based permissions (admin vs manager)

------------------------------------------------------------------------

# Conclusion

The Lease feature is designed as a domain-driven, org-safe,
transactionally consistent module that integrates cleanly with:

-   Units
-   Buildings
-   Tenants
-   Ledger (future)
-   Analytics

This architecture ensures scalability, clarity, and production
readiness.
