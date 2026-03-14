# Lease History Audit Command — Learning Notes

## What this command is

The `audit_lease_history` management command is a **read-only integrity audit tool** for the lease history layer of the app.

It exists to answer a critical question:

**Does the database actually obey the historical truth model the app is designed around?**

That truth model is:

- `Unit -> Lease -> LeaseTenant -> Tenant`
- `Tenant` stays minimal
- `Lease` is the source of truth for tenancy history
- `LeaseTenant` stores who was on the lease and in what role
- unit occupancy is derived from the currently active lease
- ending a lease should preserve history, not erase it
- historical occupancy should be reconstructable from lease rows

This command helps verify that those statements are actually true in stored data.

---

## Why this command matters

In a lease-driven system, bad data can silently break trust.

Examples:

- a lease may exist without any tenants attached
- a lease may be marked `ACTIVE` even though its `end_date` is already in the past
- a lease may be marked `ENDED` even though its date range still includes today
- a currently occupied unit may fail to resolve to a primary tenant
- historical lease rows may exist, but not contain enough party information to reconstruct who occupied the unit

Those are not just cosmetic problems.

They affect:

- unit occupancy truth
- building occupancy counts
- current tenant display
- lease edit flows
- future validation rules
- long-term trust in reporting and auditability

The management command gives the app a repeatable way to inspect those risks.

---

## What the command does

The command:

- reads lease, lease-party, tenant, and unit data
- evaluates integrity rules
- groups findings by issue type
- prints a report
- does **not** mutate data
- is safe to run in development and production
- can be run for all orgs or a single org

Example usage:

```bash
python manage.py audit_lease_history
```

Audit one organization only:

```bash
python manage.py audit_lease_history --org-id 2
```

---

## What the command checks

The command checks several categories of historical integrity.

### 1. Lease date sanity

It checks whether lease intervals are structurally valid.

Examples:

- `end_date <= start_date`
- impossible date ranges
- inconsistent lease timing assumptions

This matters because lease history depends on valid time intervals.

---

### 2. Overlapping leases on the same unit

It checks whether two leases overlap for the same unit under the app’s intended rule:

```text
[start_date, end_date)
```

That means:

- `start_date` is inclusive
- `end_date` is exclusive

So if one lease ends on March 10 and another starts on March 10, that is allowed.

This is important because occupancy should come from one active lease at a time.

---

### 3. Lease party integrity

It checks whether each lease has a valid party structure.

Examples:

- lease has no `LeaseTenant` rows
- lease has zero primary tenants
- lease has more than one primary tenant
- duplicate tenant rows on the same lease

This matters because a lease without parties cannot reconstruct who actually occupied the unit.

---

### 4. Cross-org integrity

Because the app is multi-tenant and org-scoped, the command checks whether relationships stay inside one organization.

Examples:

- `LeaseTenant` points to a lease in another org
- `LeaseTenant` points to a tenant in another org
- lease org and tenant org do not match

This protects tenant boundaries and data isolation.

---

### 5. Active occupancy integrity

It checks whether the app’s current occupancy truth is internally consistent.

Examples:

- more than one active lease for a unit today
- an active lease with no valid primary tenant
- leases whose status disagrees with their date interval

This matters because the UI and reporting layer depend on current occupancy being derived correctly from lease truth.

---

### 6. History retention integrity

It checks whether historical relationships still exist.

Examples:

- ended leases with no parties
- tenants referenced by lease history missing from the tenant table

This matters because the app should preserve lease history even after a lease ends.

---

## The most important semantic rule in this system

One of the main reasons this audit exists is to verify the app’s lease activity rule.

The intended rule is:

```text
[start_date, end_date)
```

That means a lease is active on a day if:

- `start_date <= today`
- and `end_date is null` or `end_date > today`

This is called **end-exclusive** logic.

A common subtle bug is when one part of the system uses end-exclusive logic, but another part still behaves as if `end_date` were inclusive.

That kind of mismatch can cause occupancy bugs that are hard to notice.

---

## What we learned from the first real audit run

When the command was run, it found **34 issues**.

That was extremely valuable, because it proved the command is surfacing real historical integrity problems rather than just theoretical ones.

### Summary of findings

The report showed these issue types:

- `active_lease_missing_primary: 1`
- `ended_lease_missing_parties: 6`
- `invalid_primary_tenant_count: 9`
- `lease_has_no_parties: 9`
- `lease_status_active_but_ended_by_date: 6`
- `lease_status_ended_but_active_by_dates: 3`

---

## What those findings mean

### A. Leases with no parties

This was the biggest structural finding.

Several leases existed with no `LeaseTenant` rows at all.

That means the lease exists, but the system cannot reconstruct who was on it.

This weakens the entire historical model because:

- lease is supposed to be the source of truth
- but some lease rows are missing the relationship data needed to tell the story

This is a major historical integrity problem.

---

### B. Invalid primary tenant counts

Several leases did not have exactly one primary tenant.

That means some leases had:

- zero primary tenants
- and in practice often zero parties overall

This directly breaks current and historical tenancy resolution.

For a lease-first system, that is not acceptable long-term.

---

### C. Active lease missing primary

At least one currently occupied unit had an active lease that did not resolve to a valid primary tenant.

That means the app has at least one live occupancy problem, not just a historical cleanup problem.

This can affect:

- current tenant display
- unit cards
- occupancy summaries
- lease UI logic

---

### D. Status/date semantic drift

This was one of the most important discoveries.

The audit found both of these:

- leases marked `ACTIVE` even though their `end_date` was already today or in the past
- leases marked `ENDED` even though their date interval still made them active today

This means status and interval truth are drifting apart.

That is dangerous because one part of the app may trust `status`, while another trusts the date range.

If different parts of the app trust different signals, the system becomes inconsistent.

This was the most important semantic lesson from the audit.

---

## What the first run did **not** show

A few good signs also came out of the run.

The audit did **not** report:

- overlapping lease intervals
- cross-org mismatches
- explicit orphan-style relationship failures from the implemented checks

That suggests the biggest current problems are not overlap chaos or tenant-boundary leaks.

The main problems are:

- missing lease-party history
- status/date drift

---

## What this teaches about the architecture

The app’s **domain design is strong**, but the **stored data is not fully obeying the intended rules yet**.

That is a very normal stage for an app in active development.

The important lesson is:

**a good domain model is not enough by itself**

You also need:

- service-layer rules
- selectors that use the same semantics
- tests
- audit tools
- cleanup for old or legacy rows

This command is part of that hardening system.

---

## What this command becomes over time

This is not a one-time script.

This command should stay in the app as a permanent integrity tool.

It can be used:

- during development
- before large refactors
- after changing lease logic
- before deploying stricter validations
- during staging verification
- as a periodic production audit

Over time, it becomes part of the app’s operational trust model.

In plain English:

**the command helps you check whether the app still deserves to be trusted**

---

## Recommended long-term workflow

A healthy workflow for this command looks like this:

### Before hardening rules
Run the audit first to see what bad legacy data already exists.

### After making service changes
Run the audit again to confirm new code did not introduce semantic drift.

### Before deploying stricter constraints
Run it to avoid breaking on old dirty rows already in the database.

### After data repair
Run it to verify cleanup worked.

### During long-term maintenance
Keep it available as a repeatable historical integrity check.

---

## The main lesson from this exercise

The biggest takeaway is this:

The app needed more than CRUD.
It needed a way to verify that its historical truth model is actually being preserved over time.

That is what this command provides.

This is how the system starts moving from:

- “the feature works”
to
- “the feature is historically trustworthy”

And for a lease-driven, multi-tenant property system, that difference matters a lot.

---

## Final takeaway

The `audit_lease_history` command is a permanent learning tool, debugging tool, and integrity tool.

It helps answer questions like:

- Can current occupancy be trusted?
- Can lease history be reconstructed?
- Are leases and parties still aligned?
- Are status semantics drifting away from date semantics?
- Is the database still obeying the domain model?

The first time it was run, it immediately proved its value by exposing real issues in live data.

That makes it one of the most useful hardening tools in the app.
