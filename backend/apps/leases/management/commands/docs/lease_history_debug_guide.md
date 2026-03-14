# Lease History Debug Guide

## Purpose

This guide explains the lease history audit and repair commands added to the app, what each one is for, when to use it, and what kinds of problems it can uncover.

This is especially useful in a multi-tenant, org-scoped system where the intended truth chain is:

`Unit -> Lease -> LeaseTenant(parties) -> Tenant`

and where:

- `Tenant` stays minimal
- `Lease` is the source of truth for tenancy history
- `LeaseTenant` stores who was on the lease and in what role
- unit occupancy is derived from the active lease
- ending a lease should preserve historical rows
- historical occupancy should be reconstructable from lease history

---

## Why these tools matter

These commands help you answer four important questions:

1. Is current occupancy truth consistent?
2. Is historical lease data preserved correctly?
3. Did development / seed / test paths create invalid lease data?
4. Can I inspect and clean specific integrity problems safely?

These tools are intentionally split into:
- broad audit
- targeted inspection
- narrow safe repair

That separation is important. It prevents you from jumping straight into mutating data before understanding the problem.

---

## Command 1: `audit_lease_history`

### What it does

This is the broad integrity scanner.

It audits lease history across organizations and reports issue categories like:

- overlapping leases on the same unit
- leases with no parties
- invalid primary tenant count
- active occupancy mismatches
- stale active lease statuses
- ended leases that still appear active by dates
- ended leases missing party history

### Example usage

```bash
python manage.py audit_lease_history
python manage.py audit_lease_history --org-id 2
python manage.py audit_lease_history --json
```

### Best use cases

Use this command when you want a high-level health check.

Good times to run it:

- after lease refactors
- after seed imports
- after test fixture changes
- before creating demo data
- before production deploys
- when unit occupancy looks wrong

### Problems it can solve or expose

- proves whether your lease date semantics are behaving consistently
- shows whether active occupancy is broken because of missing primary tenants
- reveals whether historical lease rows are missing party links
- catches stale status drift like:
  - `ACTIVE` but already ended by date
  - `ENDED` but still active by date
- shows whether current data can actually support historical reconstruction

### Limits

This command does not explain every flagged row in detail. It gives categories, not full forensic context.

That is why the inspection commands exist.

---

## Command 2: `inspect_lease_history_issues`

### What it does

This command takes flagged lease issues and expands them into a more readable inspection report.

It shows:

- org
- building
- unit
- lease status
- start and end dates
- whether the lease is active by date semantics
- lease parties
- primary count
- same-unit lease timeline

### Example usage

```bash
python manage.py inspect_lease_history_issues
python manage.py inspect_lease_history_issues --org-id 2
python manage.py inspect_lease_history_issues --lease-id 3
python manage.py inspect_lease_history_issues --only-code active_lease_missing_primary
python manage.py inspect_lease_history_issues --json
```

### Best use cases

Use this command after the broad audit when you need to understand specific flagged leases.

It is helpful when:

- one unit looks occupied but tenant info is missing
- one lease is clearly contradictory and you want more detail
- you want to inspect same-unit timeline context
- you want to see whether the bad row is isolated or part of a bigger chain

### Problems it can solve or expose

- identifies exactly which lease is breaking occupancy truth
- shows whether the same unit has multiple relevant leases nearby
- distinguishes a stale status problem from a party history problem
- helps you decide whether a row is safe to auto-repair or needs human review

### Limits

This command is investigative only. It does not fix anything.

---

## Command 3: `repair_lease_status_integrity`

### What it does

This is the narrow, production-safe repair tool.

It only repairs one specific class of problem:

- lease is `ACTIVE`
- `end_date` is not null
- `end_date <= today`

That means the lease is no longer active under end-exclusive semantics, so the command safely changes:

- `status = ENDED`

### Example usage

```bash
python manage.py repair_lease_status_integrity
python manage.py repair_lease_status_integrity --org-id 2
python manage.py repair_lease_status_integrity --lease-id 11
python manage.py repair_lease_status_integrity --apply
python manage.py repair_lease_status_integrity --json
```

### Important behavior

Without `--apply`, this command is dry-run only.

That is intentional.

### Best use cases

Use this command when the audit finds stale active statuses.

Examples:

- lease still marked active even though it ended days ago
- historical rows are preserved, but status drift is causing selector mismatch
- you want to reduce contradictions without guessing about tenant history

### Problems it can solve

- removes one of the most common low-risk semantic drifts in dev/test data
- reduces inconsistency between status and date truth
- makes audit output cleaner
- helps prevent stale rows from interfering with future reasoning

### What it intentionally does **not** solve

It does not:

- add missing `LeaseTenant` rows
- guess tenant identity
- fix leases marked `ENDED` but still active by dates
- infer early termination intent
- repair missing historical tenancy membership

That is by design.

---

## Command 4: `inspect_lease_party_gaps`

### What it does

This command focuses specifically on party integrity problems.

It inspects leases with:

- zero `LeaseTenant` rows
- zero primary tenants
- multiple primary tenants

It shows:

- org / building / unit
- lease status
- start and end dates
- whether active by dates
- current parties
- same-unit lease timeline
- recommended human action

### Example usage

```bash
python manage.py inspect_lease_party_gaps
python manage.py inspect_lease_party_gaps --org-id 2
python manage.py inspect_lease_party_gaps --lease-id 3
python manage.py inspect_lease_party_gaps --only-active
python manage.py inspect_lease_party_gaps --json
```

### Best use cases

Use this when the broad audit says:

- `lease_has_no_parties`
- `active_lease_missing_primary`
- invalid primary count issues

This is the best tool for answering:

- which active leases are currently breaking occupancy truth?
- which historical leases are just incomplete legacy data?
- which rows are worth fixing now vs later?

### Problems it can solve or expose

- isolates the leases that matter most to live occupancy
- highlights active leases with no parties as highest priority
- separates current operational defects from old historical gaps
- shows whether missing parties are isolated to one lease or a timeline pattern

### Limits

This command is inspection only. It does not create missing parties.

---

## Recommended workflow

### Workflow A: broad health check

Run:

```bash
python manage.py audit_lease_history
```

Use this to see the categories of defects.

---

### Workflow B: understand specific bad rows

Run:

```bash
python manage.py inspect_lease_history_issues --org-id 2
```

or:

```bash
python manage.py inspect_lease_history_issues --lease-id 3
```

Use this when a specific lease or unit needs detailed context.

---

### Workflow C: apply safe cleanup only

Run:

```bash
python manage.py repair_lease_status_integrity
```

Review dry-run output, then:

```bash
python manage.py repair_lease_status_integrity --apply
```

Use this only for safe stale status cleanup.

---

### Workflow D: focus on broken party truth

Run:

```bash
python manage.py inspect_lease_party_gaps --only-active
```

Use this to prioritize the leases that are currently breaking the occupancy truth chain.

---

## What your recent findings likely mean

Based on the output you shared, your current bad rows look much more like development / seed / test drift than a deep architectural failure.

Why:

- many leases have plausible dates but no parties
- multiple rows appear to have been created without lease-party enforcement
- status drift appeared in several rows
- active-by-date leases exist with zero parties
- some ended leases still have future end dates

That pattern usually means:

- leases were inserted during testing without full business logic
- seed scripts created rows directly
- factories or fixtures allowed partial lease creation
- status and interval semantics were not enforced consistently in non-production paths

That is actually useful information.

It means the model is probably fine, but the write paths and seed/test paths need stronger invariants.

---

## What these tools do **not** replace

These commands are excellent debugging and inspection tools, but they do **not** replace application hardening.

You still need proper business-rule enforcement so bad rows stop being created.

Eventually the app should enforce:

- a lease cannot be created without at least one party
- a lease cannot be active without exactly one primary tenant
- seed scripts and fixtures should create valid leases through the same business logic
- historical lease rows should preserve party membership whenever possible

---

## Fastest exit path right now

Since you said this database was built during normal development and testing, the fastest exit path is:

1. keep these commands
2. stop spending time manually repairing low-value dev/test history
3. use the commands as guardrails
4. later harden:
   - lease create/update service
   - seed helpers
   - test fixtures
   - invariant tests

That gets the value without wasting time polishing disposable data.

---

## Best next engineering steps later

When you come back to harden this area, the highest-value follow-up work is:

1. enforce lease-party invariants in the service layer
2. add pytest coverage for lease history invariants
3. create valid seed/factory helpers so new fake data stays clean
4. optionally create a dedicated remediation flow for demo-quality data

---

## Quick reference

### Broad audit
```bash
python manage.py audit_lease_history
```

### JSON audit
```bash
python manage.py audit_lease_history --json
```

### Inspect flagged leases
```bash
python manage.py inspect_lease_history_issues --org-id 2
```

### Inspect one flagged lease
```bash
python manage.py inspect_lease_history_issues --lease-id 3
```

### Dry-run status repair
```bash
python manage.py repair_lease_status_integrity
```

### Apply safe status repair
```bash
python manage.py repair_lease_status_integrity --apply
```

### Inspect party gaps
```bash
python manage.py inspect_lease_party_gaps
```

### Inspect active party gaps only
```bash
python manage.py inspect_lease_party_gaps --only-active
```

---

## Final takeaway

These tools give you a clean debugging ladder:

- audit broadly
- inspect deeply
- repair narrowly
- harden write paths later

That is the right approach for a lease-first, history-preserving tenancy model.
