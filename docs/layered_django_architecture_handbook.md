# Layered Django Architecture: Service + Selector + Serializer + ViewSet + Mixin Pattern

**Author:** Anthony Narine  
**Purpose:** Reusable backend blueprint for building scalable Django and Django REST Framework applications.

---

## What this pattern is

This is a **layered backend architecture** for Django and DRF applications where each layer has a narrow, intentional responsibility.

The pattern can be summarized like this:

> **Models store truth. Services handle writes. Selectors handle reads. Serializers shape API data. ViewSets orchestrate requests. Mixins reuse shared behavior.**

This is a practical modular-monolith pattern for serious applications that need:

- clear domain boundaries
- predictable write workflows
- optimized read paths
- reusable API conventions
- multi-tenant safety
- long-term maintainability

---

## Why this pattern matters

Many Django projects become hard to maintain because too much logic ends up in the wrong places:

- fat views
- giant serializers
- duplicated queryset logic
- weak tenant boundaries
- business rules scattered across the codebase

This pattern fixes that by giving every concern a home.

If the architecture is working, a developer should be able to answer these questions quickly:

- Where do write rules live?
- Where are reads composed?
- Where is the API shape defined?
- Where is tenant scoping enforced?
- Where should a new feature be added?

---

## The headline pattern

# Service + Selector + Serializer + ViewSet + Mixin Architecture

That is the memorable internal label.

The polished documentation name is:

# Layered Django Architecture: Service + Selector + Serializer + ViewSet + Mixin Pattern

Use the full polished name in your README, architecture docs, portfolio docs, and teaching material.

---

## The mental model

When building a feature, ask these questions in order:

1. **What data exists?** → `models`
2. **What rules apply when data changes?** → `services`
3. **How should data be read efficiently?** → `selectors`
4. **How should the API accept and return data?** → `serializers`
5. **How does the request get orchestrated?** → `viewsets/views`
6. **What mechanics are shared across endpoints?** → `mixins`

This gives you a repeatable system for deciding where code belongs.

---

## High-level request flow

### Read flow

```text
Client
  -> ViewSet
    -> Selector
      -> Model / QuerySet
    -> Read Serializer
  -> JSON Response
```

### Write flow

```text
Client
  -> ViewSet
    -> Write Serializer
      -> Service
        -> Model / Database
    -> Read Serializer
  -> JSON Response
```

This split is the heart of the pattern:

- **read complexity** belongs in selectors
- **write complexity** belongs in services

---

## Layer responsibilities

## 1. Models

Models represent **durable domain truth**.

They answer:

> What facts exist in the system?

Examples:

- Expense
- Tenant
- Lease
- Building
- Vendor
- Invoice

Models should contain:

- fields
- relationships
- constraints
- indexes
- timestamps
- explicit statuses
- archive or soft-delete fields when needed

Models should **not** become workflow coordinators.

Avoid putting large request workflows or cross-domain orchestration into model methods.

---

## 2. Services

Services own **write-side business logic**.

They answer:

> What must happen, and what rules must be enforced, when state changes?

Examples:

- create expense
- update lease
- archive tenant
- approve invoice
- move tenant out
- create building with default settings

Services should handle:

- transactions
- state transitions
- cross-model writes
- business rule enforcement
- side effects
- domain validation beyond serializer shape checks

A service should feel like:

> the official way an action happens in the system.

---

## 3. Selectors

Selectors own **read-side query composition**.

They answer:

> How should this data be fetched efficiently and consistently?

Selectors should handle:

- queryset composition
- filtering
- `select_related`
- `prefetch_related`
- annotations
- reporting queries
- aggregates
- dashboard summaries

If the same queryset logic appears in multiple places, it probably belongs in a selector.

---

## 4. Serializers

Serializers define the **API contract**.

They answer:

> How does the outside world send data into the system, and how does the system send data back out?

### Write serializers

Use for create, update, and action payload validation.

They should:

- validate shape
- validate simple field rules
- normalize payload data
- pass clean data into services

They should **not** carry the full business process.

### Read serializers

Use for list, detail, and UI-friendly response payloads.

They should:

- expose nested data
- include computed display fields
- shape output for frontend use
- keep response contracts consistent

---

## 5. ViewSets and views

ViewSets orchestrate **HTTP request flow**.

They should:

- receive the request
- resolve org or tenant scope
- pick the serializer
- call selectors for reads
- call services for writes
- return the response

They should remain **thin orchestration layers**.

A view should not become the place where business logic, query complexity, and domain rules pile up.

---

## 6. Mixins

Mixins provide **reusable endpoint behavior**.

Examples:

- organization scoping
- serializer selection by action
- standard pagination behavior
- permission helpers
- archive helpers
- common query param parsing

Mixins should be used for **shared mechanics**, not domain-specific business workflows.

---

## Layer placement guide

Use this quick classifier.

| If the code is about... | It belongs in... |
|---|---|
| storing durable facts | model |
| changing state safely | service |
| querying efficiently | selector |
| shaping request/response data | serializer |
| handling HTTP orchestration | view or viewset |
| sharing repeated endpoint behavior | mixin |

---

## The non-negotiable boundary rules

1. **Do not put major business workflows in views.**
2. **Do not put heavy query composition in serializers.**
3. **Do not duplicate queryset logic across endpoints.**
4. **Do not turn serializers into mini-services.**
5. **Do not let models become god objects.**
6. **Do not trust client-provided ownership or tenant scope. Enforce it server-side.**
7. **Do not mix read and write responsibilities just because Django makes it easy.**

---

## Recommended folder structure

Use this once an app grows beyond a tiny prototype.

```text
apps/
  expenses/
    models.py
    choices.py
    urls.py
    permissions.py
    filters.py

    services/
      expense_create_service.py
      expense_update_service.py
      expense_archive_service.py
      expense_approval_service.py

    selectors/
      expense_list_selectors.py
      expense_detail_selectors.py
      expense_reporting_selectors.py
      expense_lookup_selectors.py

    serializers/
      expense_write_serializers.py
      expense_read_serializers.py
      category_serializers.py
      vendor_serializers.py

    views/
      mixins.py
      expense_views.py
      category_views.py
      vendor_views.py

    tests/
      test_services.py
      test_selectors.py
      test_serializers.py
      test_views.py
```

Split by responsibility when files start to become large. Small modules are easier to reason about, easier to test, and easier to extend.

---

## Build order for a new app

Use this sequence every time.

### Step 1. Define the domain

Ask:

- What are the core entities?
- What relationships exist?
- What statuses or states matter?
- What belongs to the organization or tenant?

Output:

- models
- choices or enums
- constraints
- indexes

### Step 2. Define the write actions

Ask:

- What actions can users perform?
- What rules must be enforced?
- What actions require transactions?
- What side effects happen?

Output:

- service functions or service modules

### Step 3. Define the read use cases

Ask:

- What lists exist?
- What detail pages exist?
- What summaries or dashboards exist?
- What reports are needed?

Output:

- selector functions

### Step 4. Define the API contracts

Ask:

- What does the frontend send?
- What does the frontend need back?
- Are read and write shapes different?

Output:

- write serializers
- read serializers

### Step 5. Wire thin views

Ask:

- What endpoints exist?
- Which selector powers each read endpoint?
- Which service powers each write endpoint?
- Which mixins should be reused?

Output:

- viewsets/views
- mixins
- router or urls

### Step 6. Test by layer

Test:

- services for rule enforcement
- selectors for query correctness
- serializers for payload validation
- views for endpoint behavior

---

## Example lifecycle for a feature

Imagine a feature called **Expenses**.

### Domain objects

- Expense
- ExpenseCategory
- Vendor
- ExpenseAttachment

### Main write actions

- create expense
- update expense
- archive expense
- approve expense

### Main read use cases

- paginated list
- expense detail page
- reporting summary
- category lookup dropdown
- vendor lookup dropdown

### Layer mapping

```text
models.py
  Expense, ExpenseCategory, Vendor, ExpenseAttachment

services/
  expense_create_service.py
  expense_update_service.py
  expense_archive_service.py
  expense_approval_service.py

selectors/
  expense_list_selectors.py
  expense_detail_selectors.py
  expense_reporting_selectors.py
  expense_lookup_selectors.py

serializers/
  expense_write_serializers.py
  expense_read_serializers.py

views/
  mixins.py
  expense_views.py
```

This makes the feature easier to scale without turning one file into a monster.

---

## Generic feature blueprint template

Use this before starting any serious app module.

### 1. Domain name
Example: Expenses

### 2. Core entities
- 
- 
- 

### 3. Ownership boundary
- org-owned
- building-scoped
- unit-scoped
- lease-scoped

### 4. Main write actions
- 
- 
- 

### 5. Main read use cases
- paginated list
- detail page
- dashboard summary
- reports/export
- lookups

### 6. Service layer plan
- 
- 
- 

### 7. Selector layer plan
- 
- 
- 

### 8. Serializer plan
**Write serializers**
- 
- 

**Read serializers**
- 
- 

### 9. View plan
- GET /resource/
- POST /resource/
- GET /resource/{id}/
- PATCH /resource/{id}/
- action endpoints if needed

### 10. Shared mixins
- 
- 
- 

### 11. Testing plan
- service tests
- selector tests
- serializer tests
- API tests

### 12. Risks
- cross-org leakage
- duplicated logic
- oversized serializers
- hidden write rules

---

## Multi-tenant safety rules

If the app is multi-tenant, every layer must respect tenant boundaries.

Best practices:

- models should make ownership explicit
- selectors should filter by organization first
- services should validate org consistency before writing
- views should resolve org from the authenticated request context
- serializers should never trust cross-org ids blindly

The rule to remember is simple:

> No request should read or mutate another tenant's data by accident.

---

## Audit-friendly design

For operational systems, auditability matters.

Recommended defaults:

- explicit statuses
- archive flags instead of destructive delete when appropriate
- `created_at` and `updated_at`
- deterministic validation rules
- integrity inspection commands
- clear service boundaries so write actions are easy to inspect

This architecture works well with future audit tooling because reads and writes are already separated.

---

## What this pattern is best for

Use this architecture when:

- the product has real domain rules
- reporting matters
- the application will grow over time
- multiple endpoints share the same data
- the product is multi-tenant
- auditability matters
- the backend must stay understandable for years

Avoid overengineering tiny throwaway prototypes.

---

## The cheat sheet to memorize

```text
Models store truth.
Services handle writes.
Selectors handle reads.
Serializers shape API data.
ViewSets orchestrate the request.
Mixins reuse the mechanics.
```

If you keep that straight, your backend stays clean.

---

## Final principle

> Build backend systems so the code explains the domain.

That means:

- explicit naming
- small focused modules
- deterministic write rules
- reusable read patterns
- safe tenant enforcement
- predictable API contracts

That is what makes a backend teachable, scalable, and maintainable.

---

## Suggested repo usage

You can place this document in any backend repo as:

- `docs/architecture/layered_django_architecture.md`
- `docs/backend-pattern.md`
- `architecture/backend_blueprint.md`

It works as both:

- a teaching handbook for yourself
- a build standard for future applications

