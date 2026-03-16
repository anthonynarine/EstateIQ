# Tenant Residency Audit

## Purpose

This document explains the tenant residency audit tooling for the EstateIQ backend.

The tenant area now derives residency truth from relational data instead of storing duplicated history fields on the `Tenant` model.

The read model depends on:

- `Tenant` = identity and contact information
- `Lease` = tenancy term, dates, status, occupancy interval
- `LeaseTenant` = tenant-to-lease relationship and role
- `Unit` and `Building` = residence context

That means tenant residency correctness depends on the integrity of the relationship chain:

`Tenant -> LeaseTenant -> Lease -> Unit -> Building`

The audit tooling exists to validate that chain and make debugging easier.

---

## Active Lease Truth

The audit system uses the same active-lease semantics as the application:

- `start_date` is **inclusive**
- `end_date` is **exclusive**
- open-ended leases remain active
- a lease must also be stored as `ACTIVE` to resolve as currently active in the tenant read model

Mathematically, lease activity is evaluated like this:

`[start_date, end_date)`

Examples:

- `2026-03-01 -> 2026-04-01` means active through **2026-03-31**
- on `2026-04-01`, that lease is no longer active
- `end_date=None` means the lease remains active after its start date

---

## Commands

## 1) Broad audit

Run the broad tenant residency audit for one organization:

```bash
python manage.py audit_tenant_residency --org-id=2
```

This command scans tenant residency integrity and reports findings such as:

- lease status/date drift
- overlapping lease intervals
- cross-org relationship issues
- duplicate tenant-to-lease links
- active lease chain problems
- history chain problems

### Useful options

Audit only tenants who currently resolve to an active lease:

```bash
python manage.py audit_tenant_residency --org-id=2 --only-active
```

Audit one tenant inside an org:

```bash
python manage.py audit_tenant_residency --org-id=2 --tenant-id=2
```

Include empty-history findings that are hidden by default:

```bash
python manage.py audit_tenant_residency --org-id=2 --include-empty-history
```

Show only medium-and-up findings:

```bash
python manage.py audit_tenant_residency --org-id=2 --min-severity=medium
```

Show only high findings:

```bash
python manage.py audit_tenant_residency --org-id=2 --min-severity=high
```

Return JSON output:

```bash
python manage.py audit_tenant_residency --org-id=2 --json
```

Limit the number of returned findings after filtering:

```bash
python manage.py audit_tenant_residency --org-id=2 --limit=10
```

### Notes

- `tenant_has_no_lease_history` is hidden by default because it is often development noise
- use `--include-empty-history` when you explicitly want to inspect that category
- `--tenant-id` requires `--org-id`
- the command validates that the organization and tenant exist before running

---

## 2) Single-tenant surgical inspection

Inspect one tenant’s residency history in detail:

```bash
python manage.py inspect_tenant_history --org-id=2 --tenant-id=2
```

This command prints:

- tenant identity
- derived current status
- active lease summary, if one resolves cleanly
- full linked lease history
- unit/building context for each linked lease
- anomalies for that tenant only

Return JSON output:

```bash
python manage.py inspect_tenant_history --org-id=2 --tenant-id=2 --json
```

### Notes

- this command is read-only
- it validates that the tenant exists inside the requested organization
- this is the best tool for debugging one suspicious tenant after the broad audit flags something

---

## What the Broad Audit Output Means

The broad audit reports:

- **Raw findings** = everything returned by the audit service
- **Filtered findings** = results after command-level filtering
- **Returned findings** = results after filtering and `--limit`

### Severity Levels

- **HIGH** = likely breaks current residency truth or violates core integrity rules
- **MEDIUM** = important integrity drift or suspicious relationship pattern
- **LOW** = historical oddity, incomplete seed data, or weaker signal

---

## Common Findings

## `tenant_lease_status_active_but_inactive_by_dates`

Meaning:

- a lease is stored as `ACTIVE`
- but according to end-exclusive date semantics it is not actually active today

Example causes:

- lease status was not updated after the lease ended
- development/test data drift
- a repair or lifecycle transition did not complete

Why it matters:

- stored lease truth and derived date truth disagree
- this can confuse downstream reporting and debugging

---

## `tenant_lease_status_ended_but_active_by_dates`

Meaning:

- a lease is stored as `ENDED`
- but by date semantics it still falls inside the active interval

Example causes:

- lease ended early in storage without matching date correction
- manual test edits created inconsistency

Why it matters:

- the lease may still be active by interval logic even though status says otherwise

---

## `tenant_multiple_active_leases`

Meaning:

- one tenant resolves to more than one active lease on the evaluation date

Why it matters:

- the tenant read model cannot determine a single clean current residence
- this is usually a high-priority integrity problem

---

## `tenant_overlapping_lease_intervals`

Meaning:

- two linked tenant lease intervals overlap under `[start_date, end_date)` rules

Why it matters:

- if both overlaps are current, this is severe
- if the overlap is historical only, it is usually lower severity
- in development databases this often comes from reseeding or duplicate manual creation

---

## `tenant_active_lease_missing_unit`

Meaning:

- an active lease does not resolve to a unit

Why it matters:

- the system cannot produce a valid current residence summary

---

## `tenant_active_lease_missing_building`

Meaning:

- an active lease resolves to a unit, but the unit does not resolve to a building

Why it matters:

- tenant residence summaries become incomplete or misleading

---

## `tenant_active_lease_invalid_primary_structure`

Meaning:

- an active lease does not resolve to exactly one primary tenant

Why it matters:

- this can create ambiguity in lease ownership and tenant-residency truth

---

## `tenant_has_no_lease_history`

Meaning:

- the tenant has no linked lease rows

Why it is hidden by default:

- this is often normal in development or partially-seeded environments
- it is useful sometimes, but usually too noisy for the broad command

Use this when needed:

```bash
python manage.py audit_tenant_residency --org-id=2 --include-empty-history
```

---

## Suggested Workflow

### Broad health check

Run:

```bash
python manage.py audit_tenant_residency --org-id=2
```

Use this to see whether the tenant residency read model looks trustworthy overall.

### Focus on current tenants only

Run:

```bash
python manage.py audit_tenant_residency --org-id=2 --only-active
```

Use this to validate current occupancy truth without old historical noise.

### Investigate one tenant deeply

Run:

```bash
python manage.py inspect_tenant_history --org-id=2 --tenant-id=2
```

Use this after the broad scan flags a specific tenant.

### Export structured output

Run:

```bash
python manage.py audit_tenant_residency --org-id=2 --json
```

or:

```bash
python manage.py inspect_tenant_history --org-id=2 --tenant-id=2 --json
```

Use this for future tooling, admin surfaces, or repair planning.

---

## Design Principles

This audit system is intentionally:

- **read-only first**
- **organization-scoped**
- **deterministic**
- **service-layer driven**
- **safe for production debugging**
- **aligned with the existing lease audit style**

It does **not**:

- mutate data
- auto-repair records
- duplicate residency fields onto `Tenant`
- replace the actual lease lifecycle rules

---

## Recommended Repo Location

Store this file at:

```text
docs/TENANT_RESIDENCY_AUDIT.md
```

---

## Current Supported Commands

```bash
python manage.py audit_tenant_residency --org-id=2
python manage.py audit_tenant_residency --org-id=2 --only-active
python manage.py audit_tenant_residency --org-id=2 --tenant-id=2
python manage.py audit_tenant_residency --org-id=2 --include-empty-history
python manage.py audit_tenant_residency --org-id=2 --min-severity=medium
python manage.py audit_tenant_residency --org-id=2 --min-severity=high
python manage.py audit_tenant_residency --org-id=2 --json
python manage.py audit_tenant_residency --org-id=2 --limit=10

python manage.py inspect_tenant_history --org-id=2 --tenant-id=2
python manage.py inspect_tenant_history --org-id=2 --tenant-id=2 --json
```
