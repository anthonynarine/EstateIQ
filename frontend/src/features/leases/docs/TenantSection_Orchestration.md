# TenantSection Component Orchestration

EstateIQ -- Lease Form Architecture Documentation

------------------------------------------------------------------------

## Overview

The TenantSection module is responsible for managing tenant selection
within the CreateLeaseForm workflow.

It supports two modes:

-   **Select existing tenant**
-   **Create new tenant inline**

The design is intentionally modular and orchestration-driven to ensure:

-   Clean separation of responsibilities
-   Predictable state flow
-   No API logic inside UI components
-   Easy future expansion (edit lease, renew lease, modal variants)

------------------------------------------------------------------------

# Component Tree

CreateLeaseForm └── TenantSection (orchestrator) ├── TenantModeToggle
├── TenantSelectPanel │ └── TenantSelect (uses useTenantsQuery) └──
TenantCreatePanel

------------------------------------------------------------------------

# Responsibility Boundaries

## CreateLeaseForm

-   Owns overall lease form submission
-   Owns orchestration (future: create-tenant-then-lease)
-   Owns mutation execution
-   Owns normalized API error routing

## TenantSection (Orchestrator)

-   Owns visual tenant card shell
-   Switches between select/create panels
-   Does NOT perform API calls
-   Does NOT mutate leases or tenants

## TenantModeToggle

-   Pure presentational toggle
-   Emits mode change upward

## TenantSelectPanel

-   Wraps TenantSelect
-   Handles existing tenant selection
-   Uses org-scoped tenant directory

## TenantCreatePanel

-   Manages draft tenant input UI
-   Displays field-level validation errors
-   No submission logic

------------------------------------------------------------------------

# State Ownership Model

State is owned by useCreateLeaseForm hook.

Tenant-related state:

-   tenantMode: "select" \| "create"
-   primaryTenantId
-   tenantCreateDraft
-   tenantCreateFieldErrors

This ensures:

-   UI remains stateless
-   Business logic remains centralized
-   Unit tests can target hook independently

------------------------------------------------------------------------

# Data Flow (Phase B -- Future)

User clicks "Create lease"

If mode === "select": POST /leases with existing tenant_id

If mode === "create": POST /tenants → receive tenant.id → POST /leases
with tenant.id

All of this orchestration will live inside:

useCreateLeaseWithTenant()

UI remains unaware of API sequencing.

------------------------------------------------------------------------

# Why This Architecture Scales

1.  UI components are small and testable
2.  No business logic leaks into presentation
3.  Multi-tenant safety preserved via orgSlug
4.  Easy to swap inline create for modal in future
5.  Enables future lease editing with same panels

------------------------------------------------------------------------

# Testing Strategy

Unit Test Targets:

-   useCreateLeaseForm (validation + payload building)
-   useCreateLeaseWithTenant (orchestration logic)

Component Test Targets:

-   TenantModeToggle rendering
-   TenantCreatePanel field error display
-   TenantSection mode switching behavior

------------------------------------------------------------------------

# Extension Roadmap

Future improvements:

-   Autocomplete tenant search
-   Create tenant modal instead of inline
-   Duplicate detection (email match)
-   AI-assisted tenant profile suggestions

------------------------------------------------------------------------

# Architectural Principle

TenantSection is a presentation boundary.

All financial correctness, mutation ordering, and org isolation must
remain in service-layer hooks.

UI is declarative. Business logic is deterministic.
