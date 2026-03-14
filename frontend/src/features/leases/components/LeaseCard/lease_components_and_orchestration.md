# Lease Components and LeaseCard Orchestration

## Overview

This document explains how the lease UI was decomposed into focused components and how the `LeaseCard` now acts as an orchestrator instead of a giant all-in-one component.

The main goals of the refactor were:

- reduce `LeaseCard.tsx` size and cognitive load
- move business rules out of JSX
- align frontend behavior with the hardened backend lease contract
- make the lease UI easier to style, test, and extend
- prepare the edit flow for safe tenant-aware updates

---

## Core business rule

A lease must always resolve through the authoritative relationship:

**Unit → Lease → primary LeaseTenant → Tenant**

That means:

- tenant display should come from `parties_detail`
- update flows must preserve or replace the primary tenant safely
- legacy invalid leases missing a primary tenant must be surfaced clearly in the UI
- the frontend should never rely on stale or duplicated tenant assumptions

---

## Current lease architecture

The lease feature is now split across three main layers:

### 1. API / contract layer

This layer defines the backend-aligned lease shapes and helpers.

#### Key files

- `src/features/leases/api/types.ts`
- `src/features/leases/api/leaseApi.ts`
- `src/features/leases/utils/leaseParty.ts`

#### Responsibilities

- define the canonical `Lease` shape
- define `LeasePartyDetail` and `LeasePartyRole`
- expose `UpdateLeaseInput`
- derive authoritative tenant state from `parties_detail`

#### Important helper functions

From `leaseParty.ts`:

- `getPrimaryLeaseParty(lease)`
- `getPrimaryTenantId(lease)`
- `getPrimaryTenantDisplayName(lease)`
- `hasPrimaryLeaseParty(lease)`
- `requiresPrimaryTenantRepair(lease)`
- `isSamePrimaryTenant(lease, selectedTenantId)`

These helpers are the safe read-model layer for lease tenant display and validation.

---

### 2. Edit form orchestration layer

This layer owns reducer-backed edit state and safe submit branching.

#### Key files

- `src/features/leases/forms/EditLeaseForm/types.ts`
- `src/features/leases/forms/EditLeaseForm/reducer.ts`
- `src/features/leases/forms/EditLeaseForm/useEditLeaseForm.ts`
- `src/features/leases/forms/EditLeaseForm/useEditLeaseSubmit.ts`

#### Responsibilities

##### `types.ts`
Defines:

- reducer state shape
- tenant draft shape
- action types
- form return contract

##### `reducer.ts`
Owns:

- state initialization from the lease
- reducer transitions for edit fields
- tenant mode switching
- reset behavior

##### `useEditLeaseForm.ts`
Owns:

- reducer-backed form state
- field setters
- validation
- derived values like:
  - `initialPrimaryTenantId`
  - `requiresTenantRepair`
  - `hasTenantChanged`
- building the terms-only patch

##### `useEditLeaseSubmit.ts`
Owns:

- calling the hardened update mutation
- deciding which workflow to use
- enforcing safe update rules

Supported workflows include:

- `terms-only`
- `replace-primary`
- `repair-with-existing-tenant`
- `repair-with-new-tenant`

This keeps backend-sensitive branching out of the JSX layer.

---

### 3. Presentational component layer

This layer renders the card, modal shell, summary panels, and workspace sections.

#### Key files

- `src/features/leases/components/LeaseCard/LeaseCard.tsx`
- `src/features/leases/components/LeaseCard/LeaseCardHeader.tsx`
- `src/features/leases/components/LeaseCard/LeaseTenantPanel.tsx`
- `src/features/leases/components/LeaseCard/LeaseSummaryGrid.tsx`
- `src/features/leases/components/LeaseCard/LeaseRepairBanner.tsx`
- `src/features/leases/components/LeaseCard/LeaseActions.tsx`
- `src/features/leases/components/LeaseCard/EditLeaseModal.tsx`
- `src/features/leases/components/LeaseCard/LeaseTermsForm.tsx`
- `src/features/leases/components/LeaseCard/formatters.ts`
- `src/features/leases/components/LeaseCard/types.ts`

---

## LeaseCard package breakdown

### `LeaseCard.tsx`

This is now the **orchestrator**, not the place where everything lives.

#### Responsibilities

- receive top-level props
- derive primary tenant data from `parties_detail`
- initialize modal open / close state
- initialize `useEditLeaseForm`
- initialize `useEditLeaseSubmit`
- compose child presentational components

#### What it should not do

`LeaseCard.tsx` should not be the place for:

- giant blocks of modal JSX
- inline form validation
- inline payload building
- raw backend workflow branching
- formatting helpers
- tenant relationship interpretation logic

That logic now lives in hooks, helpers, and child components.

---

### `LeaseCardHeader.tsx`

#### Responsibilities

- icon treatment
- title / display label
- lease status pill
- date range
- optional DB id display

This keeps the top section of the card clean and reusable.

---

### `LeaseTenantPanel.tsx`

#### Responsibilities

- show the authoritative primary tenant
- show email / phone if available
- visually emphasize active-lease tenant state
- show missing-primary warning state when needed

This is one of the most important domain components because the tenant attached to the lease is operationally meaningful.

---

### `LeaseSummaryGrid.tsx`

#### Responsibilities

- show compact lease metrics:
  - rent
  - due day
  - deposit

This component was later tightened visually so it feels less bulky inside the card.

---

### `LeaseRepairBanner.tsx`

#### Responsibilities

- render the warning state for legacy-invalid leases
- make it clear that a primary tenant repair is required before safe terms-only updates

This is intentionally isolated because it represents an important business state.

---

### `LeaseActions.tsx`

#### Responsibilities

- render compact or full edit actions
- keep action layout separate from card content layout

Design rule used:

- compact cards can use icon-only action buttons
- full cards should favor labeled actions

---

### `EditLeaseModal.tsx`

#### Responsibilities

- render the edit modal shell
- show current primary tenant context
- render modal-level error sections
- host child form content
- own reset/save button layout

This prevents the modal shell from bloating `LeaseCard.tsx`.

---

### `LeaseTermsForm.tsx`

#### Responsibilities

- render lease terms fields:
  - start date
  - end date
  - rent amount
  - security deposit
  - rent due day
  - status

It is intentionally presentational and receives values + change handlers from the edit form hook.

---

### `formatters.ts`

#### Responsibilities

- keep formatting and view helpers out of the card body

Currently includes helpers such as:

- `formatMoney`
- `formatDateRange`
- `getStatusCopy`
- `getStatusPillClasses`

---

### `types.ts` inside `LeaseCard/`

#### Responsibilities

- define shared display-layer props for the card package
- reduce prop-shape duplication across components

---

## How LeaseCard orchestration works

The flow is now:

### Step 1: LeaseCard receives the lease resource

The parent surface passes in a `Lease` object that already includes `parties_detail`.

### Step 2: LeaseCard derives authoritative tenant state

Using `leaseParty.ts`, the card computes:

- current primary tenant
- missing-primary state
- tenant display metadata

### Step 3: LeaseCard initializes reducer-backed edit form state

`useEditLeaseForm(lease)` creates:

- edit state
- validation
- patch builder
- tenant workflow state

### Step 4: LeaseCard initializes safe submit logic

`useEditLeaseSubmit(...)` chooses the right update path and calls the mutation layer.

### Step 5: LeaseCard assembles children

The card composes:

- `LeaseCardHeader`
- `LeaseTenantPanel`
- `LeaseSummaryGrid`
- `LeaseRepairBanner`
- `EditLeaseModal`
- `LeaseTermsForm`

This is the main architectural improvement: **assembly happens in the card, but logic lives elsewhere**.

---

## Why this refactor matters

### Before
The old `LeaseCard` mixed:

- display
- modal
- state
- validation
- payload normalization
- submit logic
- business rules

That made the file too large, harder to style, and harder to trust.

### After
The new structure gives:

- smaller files
- clearer responsibilities
- safer update behavior
- easier visual iteration
- easier future extension for tenant replacement UI

---

## Current frontend-safe edit behavior

At this point, the edit stack is aligned around the hardened backend contract.

### Safe behavior now includes

- terms-only updates for leases with valid primary tenants
- visible warning state for leases missing a primary tenant
- reducer-backed edit state
- safe submit branching infrastructure

### Near-term extension path

The next likely enhancement is adding tenant-aware edit UI so the modal can support:

- select a replacement tenant
- create a new tenant during lease edit
- repair a legacy invalid lease directly from the modal

The orchestration layer is already prepared for that direction.

---

## Current workspace surfaces

### `CurrentLeasePanel.tsx`

This panel now acts as the workspace shell around the lease card.

#### Responsibilities

- determine whether the unit has:
  - an active lease
  - a draft lease
  - vacancy / create-lease availability
  - blocked lease state
- show the right banner/state
- render `LeaseCard` as the hero detail component for current or draft lease state

The panel was also visually tightened to remove bulky duplicated summary sections.

---

### `LeaseWorkspaceHero.tsx`

This is the route-level header for lease management views.

#### Responsibilities

- orient the user in the lease workspace
- show building / unit context
- provide back navigation
- show organization context

This component was later tightened to reduce excessive vertical height and make the page feel less stretched.

---

## Why the tenant now belongs on the lease card

The tenant attached to the lease should be visible directly on the card because that is what users actually care about operationally.

When a user looks at a lease, they want to know:

- who the tenant is
- whether the lease is active
- rent amount
- due day
- lease dates

If the UI hides the tenant, the user has to mentally reconstruct a relationship the system already knows.

That is why the tenant panel is now a first-class part of the `LeaseCard`.

---

## Suggested next enhancement

The next valuable improvement is:

### Show tenant bio on the unit card itself

That would let the unit workspace surface display a lightweight tenant summary for occupied units without requiring the user to click into the lease workspace first.

A likely direction:

- derive active lease from unit lease query
- resolve primary tenant from `parties_detail`
- show tenant name on the unit card
- optionally show one or two additional fields such as:
  - email
  - phone
  - “active lease” badge

This would strengthen the building/unit workspace even more.

---

## Final architectural principle

The biggest improvement from this refactor is not just smaller files.

It is this:

**deterministic business rules now live in hooks and helpers, while components focus on presentation and orchestration.**

That makes the system easier to trust, easier to extend, and easier to keep aligned with the backend lease contract.
