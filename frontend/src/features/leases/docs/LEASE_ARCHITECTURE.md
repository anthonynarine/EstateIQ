# Lease Workflow Architecture

## Overview

The Lease workflow manages the relationship between Organization,
Building, Unit, Lease, LeaseTenant, and Tenant.

Core invariant: A Lease must always resolve to a primary tenant
relationship.

------------------------------------------------------------------------

## Domain Model

Organization └── Building └── Unit └── Lease └── LeaseTenant
(role="primary") └── Tenant

A lease is not valid unless a primary tenant exists.

------------------------------------------------------------------------

## Problem This Refactor Solved

Previously a lease could exist without a LeaseTenant record:

Lease └── (no tenant relationship)

This caused: - Occupied units with no visible tenant - UI expecting
tenant data that did not exist - Broken occupancy displays

The root cause was lease creation being allowed without enforcing tenant
linkage.

------------------------------------------------------------------------

## Backend Architecture

ViewSet → Serializer → Service Layer → Models

View Layer - exposes endpoints - delegates writes

Serializer Layer - validates payload shape - converts nested structures

Service Layer - transaction safety - org boundary validation - ensures
exactly one primary tenant

Example create flow:

Request ↓ Serializer validation ↓ Service validation ↓
transaction.atomic create Lease create LeaseTenant(primary) commit

------------------------------------------------------------------------

## Frontend Architecture

CreateLeaseForm.tsx ↓ useCreateLeaseForm ↓ useCreateLeaseSubmit ↓
useCreateLeaseMutation ↓ leaseApi / tenantsApi

CreateLeaseForm - UI orchestration - renders sections - shows errors -
triggers submit workflow

useCreateLeaseForm - reducer-based state - validation - payload building

Payload builders: - buildExistingTenantPayload() -
buildNewTenantLeasePayload()

useCreateLeaseSubmit - ensures org context - runs validation - chooses
workflow - calls mutation

useCreateLeaseMutation existing tenant → create lease new tenant →
create tenant → create lease

------------------------------------------------------------------------

## Form State Model

Lease fields: - startDate - endDate - rentAmount - rentDueDay -
securityDeposit - status

Tenant workflow: - tenantMode - primaryTenantId - tenantCreateDraft

Assignment: - selectedBuildingId - selectedUnitId

UI: - localError

------------------------------------------------------------------------

## Tenant Workflow

Existing Tenant User selects tenant → buildExistingTenantPayload() →
create lease

New Tenant User enters tenant draft → buildNewTenantLeasePayload() →
mutation creates tenant → mutation creates lease

------------------------------------------------------------------------

## Validation Strategy

Frontend validation: - valid unit required - start date required - rent
required - due day between 1--28 - end date cannot precede start date -
tenant rules depend on mode

Backend validation: - org boundaries - lease overlap rules - tenant
existence - exactly one primary tenant

Backend is source of truth.

------------------------------------------------------------------------

## Error Handling

Local form errors handled in useCreateLeaseForm.

API errors normalized through formatApiFormErrors.

Overlap errors handled by useLeaseOverlapUx.

------------------------------------------------------------------------

## Folder Structure

CreateLeaseForm/ CreateLeaseForm.tsx reducer.ts types.ts
useCreateLeaseForm.ts useCreateLeaseSubmit.ts

sections/ FormActions.tsx FormErrorSummary.tsx LeaseTermsFields.tsx
UnitAssignmentSection.tsx

TenantSection/ TenantSection.tsx TenantModeToggle.tsx
TenantSelectPanel.tsx TenantCreatePanel.tsx

------------------------------------------------------------------------

## Why This Architecture Is Production Safe

-   lease creation always resolves tenant workflow
-   reducer prevents impossible form states
-   submit orchestration isolated from UI
-   mutation layer owns async workflow
-   backend services enforce invariants

Guarantee: Every valid lease resolves to a primary tenant.

------------------------------------------------------------------------

## Suggested Next Improvements

1.  tighten submit hook types
2.  expand query invalidation
3.  add automated tests
4.  further decompose TenantSection UI
