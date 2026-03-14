# Lease History Audit Command Guide

## What this file is

This document explains the **lease history audit management command** for your Django app.

The purpose of the command is to safely inspect your database and report potential history/integrity problems related to:

- leases
- lease parties
- tenants
- occupancy
- org boundaries

It does **not** modify data.

It is meant to help you answer questions like:

- Do I have overlapping leases on the same unit?
- Do I have leases with no parties?
- Do I have leases with zero or multiple primary tenants?
- Do I have stale `ACTIVE` leases that are actually ended by date?
- Do I have occupancy mismatches?
- Is my lease-driven history model staying clean?

---

## What a Django management command is

A **management command** is a Python file that Django can run from the terminal using:

```bash
python manage.py <command_name>
```

You already use management commands all the time, even if you did not think of them that way.

Examples:

```bash
python manage.py runserver
python manage.py makemigrations
python manage.py migrate
python manage.py shell
```

Those are built-in Django commands.

You can also create your **own custom commands** for your application.

That is what `audit_lease_history.py` is:
a **custom Django management command**.

---

## Why this command belongs in your app

This command gives you an **operational audit tool** for your lease history model.

That matters because your app is built around this truth:

```text
Unit -> Lease -> LeaseTenant -> Tenant
```

And your intended rules are:

- `Tenant` stays minimal
- `Lease` is the source of truth for tenancy relationship/history
- `LeaseTenant` stores who was on the lease and in what role
- unit occupancy is derived from the active lease
- ending a lease should preserve lease history
- ending a lease should preserve tenant history
- historical occupancy should be reconstructable from leases

That is a strong domain model.

But to trust it, you need a way to audit whether the data still matches the rules.

That is exactly what this command is for.

---

## What this command checks

The audit command is designed to report issue types like:

### 1. Lease interval problems
- `end_date <= start_date`
- overlapping leases on the same unit
- invalid active-date semantics

### 2. Lease party problems
- leases with no parties
- leases with zero primary tenants
- leases with multiple primary tenants
- duplicate tenant rows on the same lease

### 3. Occupancy problems
- more than one active lease today on the same unit
- active lease with no valid primary tenant
- stale `ACTIVE` leases whose end date is already in the past
- leases marked `ENDED` that still look active by date

### 4. Multi-tenant / org boundary problems
- lease, tenant, and lease-party rows crossing org boundaries incorrectly

### 5. History preservation problems
- ended leases with no party rows
- historical tenant references missing

---

## Why this command is safe

This command is **read-only**.

It should:

- query data
- evaluate rules
- print findings

It should **not**:

- update rows
- delete rows
- insert rows
- “fix” data automatically

That makes it safe to run in:

- development
- staging
- production

This is important.

For an audit command, your first version should always be **report-only**.

---

## Where the file should live

Place the command here:

```text
backend/
└── apps/
    └── leases/
        └── management/
            └── commands/
                └── audit_lease_history.py
```

### Example full path

```text
backend/apps/leases/management/commands/audit_lease_history.py
```

---

## Why the folder structure matters

Django only discovers custom commands if they are placed in the correct structure.

You need:

```text
management/
commands/
```

inside a Django app.

So inside your `leases` app, the structure should be:

```text
apps/
└── leases/
    ├── management/
    │   └── commands/
    │       └── audit_lease_history.py
    ├── models.py
    ├── services.py
    ├── selectors.py
    └── ...
```

If those folders do not exist yet, create them.

---

## Do I need `__init__.py` files?

Yes, that is the safest move.

Create these files if they do not already exist:

```text
apps/leases/management/__init__.py
apps/leases/management/commands/__init__.py
```

They can be empty.

This helps Python and Django treat those directories as importable packages.

---

## How Django knows the command name

If the file is named:

```text
audit_lease_history.py
```

then Django will expose the command as:

```bash
python manage.py audit_lease_history
```

The command name comes directly from the filename.

---

## How to run the command

From your Django project root, run:

```bash
python manage.py audit_lease_history
```

If your project uses a different entry path, run it from the directory where `manage.py` lives.

### Example

If your structure looks like this:

```text
backend/
├── manage.py
└── apps/
```

then open the terminal in `backend/` and run:

```bash
python manage.py audit_lease_history
```

---

## How to run the command for one organization

If the command supports an org filter, you can run:

```bash
python manage.py audit_lease_history --org-id 12
```

That tells the command:

- only inspect organization `12`
- do not scan every org

This is useful when:

- debugging one customer/org
- testing on a specific dataset
- doing controlled production audits

---

## What kind of output to expect

A good audit command should print:

- a header
- the evaluation date
- a summary by issue type
- detailed findings grouped by issue code

Example shape:

```text
================================================================================
LEASE HISTORY AUDIT
Evaluation date: 2026-03-14
================================================================================

Summary by issue type:
  - invalid_primary_tenant_count: 2
  - overlapping_leases_same_unit: 1
  - lease_status_active_but_ended_by_date: 3

--------------------------------------------------------------------------------
invalid_primary_tenant_count (2)
--------------------------------------------------------------------------------
org_id=4 | Lease does not have exactly one primary tenant.
payload={'lease_id': 101, 'unit_id': 33, 'primary_count': 0, 'party_count': 2}

org_id=4 | Lease does not have exactly one primary tenant.
payload={'lease_id': 104, 'unit_id': 36, 'primary_count': 2, 'party_count': 2}
```

That kind of output is useful because it gives you:

- quick summary first
- details second
- no silent mutations
- no guessing

---

## How to think about this command architecturally

This command is not business logic.

This command is **audit logic**.

That distinction matters.

### Business logic
Business logic is what controls normal app behavior.

Examples:

- creating a lease
- ending a lease
- validating overlap rules
- assigning lease parties

That belongs in:

- services
- model validation
- selectors
- serializers
- views

### Audit logic
Audit logic checks whether the stored data still obeys the intended rules.

That belongs in:

- management commands
- admin diagnostics
- observability/reporting tools

So this command is part of your **operational safety layer**.

---

## Why this matters for your domain model

Your app should not trust “occupancy” as a manually entered truth.

It should derive occupancy from lease history.

That means your historical integrity matters a lot.

If the data gets corrupted, you can get bugs like:

- a unit showing occupied when it should not
- a unit looking vacant even though an active lease exists
- a stale active lease blocking new lease creation
- a lease having no valid primary tenant
- historical tenancy becoming hard to reconstruct

This command gives you a systematic way to catch those problems.

---

## The specific semantic issue you were worried about

You suspected a mismatch between:

- service-layer overlap logic using end-exclusive intervals
- selector logic possibly treating end dates as inclusive

The intended lease interval rule is:

```text
[start_date, end_date)
```

That means:

- `start_date` is inclusive
- `end_date` is exclusive

### Example

If a lease ends on `2026-03-14`, it is **not active** on `2026-03-14`.

It was active up to, but not including, that day.

That means a new lease starting on `2026-03-14` should be allowed.

This command helps detect rows that violate or drift away from that meaning.

---

## When you should run this command

Run it:

- after importing data
- after writing lease migration scripts
- after changing lease overlap logic
- after changing occupancy selectors
- before production releases touching lease logic
- after fixing historical bugs
- periodically in staging/production for safety

A good habit is:

- run it locally during development
- run it in staging before deploy
- run it in production when investigating weird occupancy issues

---

## A practical workflow for you

### Step 1: Add the file
Create:

```text
apps/leases/management/commands/audit_lease_history.py
```

### Step 2: Paste in the command code
Use the full implementation file.

### Step 3: Make sure the app is installed
Your `leases` app should already be in `INSTALLED_APPS`.

### Step 4: Open terminal in the Django backend root
The folder containing `manage.py`.

### Step 5: Run the command
```bash
python manage.py audit_lease_history
```

### Step 6: Read the summary first
Look at issue counts by type.

### Step 7: Inspect detailed payloads
Use the detailed findings to track down bad rows.

### Step 8: Fix issues through services or controlled scripts
Do not mutate data inside the audit command itself.

---

## Example terminal session

### Run all orgs

```bash
cd backend
python manage.py audit_lease_history
```

### Run one org

```bash
cd backend
python manage.py audit_lease_history --org-id 7
```

---

## If the command is not found

If Django says the command is unknown, check these things:

### 1. Is the file in the right folder?
It must be here:

```text
apps/leases/management/commands/audit_lease_history.py
```

### 2. Does `leases` exist in `INSTALLED_APPS`?
Check `settings.py`.

### 3. Did you create the folders correctly?
You need:

```text
management/
commands/
```

### 4. Did you add `__init__.py` files?
Safest answer: yes.

### 5. Are you running from the folder containing `manage.py`?
If not, Django may not load the project correctly.

---

## If you use a virtual environment

Activate your backend virtual environment first.

### Windows example

```bash
venv\Scripts\activate
cd backend
python manage.py audit_lease_history
```

### Mac/Linux example

```bash
source venv/bin/activate
cd backend
python manage.py audit_lease_history
```

---

## What this command does not replace

This command is important, but it does **not** replace:

- service-layer validation
- model constraints
- selector correctness
- automated tests
- migration/data-repair scripts

Think of it like this:

- **services** stop bad new data
- **constraints** enforce important rules
- **tests** prevent regressions
- **audit command** finds existing bad data

You want all four.

---

## Why this is a good pattern for PortfolioOS

For PortfolioOS, the real moat is trustworthy structured financial and operational data.

That means your system should be able to answer:

- Who occupied this unit on a given date?
- Which lease created the occupancy state?
- Who was the primary tenant on that lease?
- Did history remain intact after lease end?

This command supports that trust model.

It helps make the system feel less like a CRUD app and more like a reliable operating system with historical integrity.

---

## Recommended next step

After adding this documentation file, the next smart move is:

1. add the actual `audit_lease_history.py` command file
2. run it on development data
3. review the findings
4. fix any status/date drift
5. add pytest coverage for the main invariants

---

## Suggested companion files

You may want to create these next:

```text
docs/lease_history_audit_command_guide.md
docs/lease_history_integrity_checklist.md
apps/leases/management/commands/audit_lease_history.py
tests/leases/test_lease_history_integrity.py
```

---

## Final takeaway

This command is a **read-only diagnostic tool** for one of the most important integrity layers in your app:

- lease history
- tenant linkage
- party roles
- occupancy truth
- org-safe data boundaries

That makes it a very worthwhile tool to have in a multi-tenant, lease-driven property system.
