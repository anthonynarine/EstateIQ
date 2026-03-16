# Django Backend Architecture Pattern

### Modular Monolith Design for a SaaS Systems

Author: Anthony Narine\
Purpose: Reusable backend architecture pattern for scalable Django
applications.

------------------------------------------------------------------------

# Overview

This architecture pattern is designed for **backend systems**
with:

-   multi‑tenant SaaS architecture
-   financial or operational domains
-   audit requirements
-   reporting needs
-   AI interpretation layers
-   long‑term maintainability

The goal is **clear responsibility boundaries** so the backend remains
readable and scalable as the system grows.

------------------------------------------------------------------------

# High Level Architecture

``` mermaid
flowchart TD

Client[Client / Frontend]

View[ViewSet / API Layer]

Serializer[Serializer Layer]

Service[Service Layer<br>Business Logic]

Model[Models / Database]

Selector[Selectors<br>Query Composition]

Client --> View
View --> Serializer
Serializer --> Service
Service --> Model

View --> Selector
Selector --> Model
Selector --> Serializer
Serializer --> Client
```

------------------------------------------------------------------------

# Layer Responsibilities

## Models

Models represent **durable domain truth**.

They answer:

> What facts exist in the system?

Examples:

-   Expense
-   Tenant
-   Lease
-   Building
-   Vendor

Models contain:

-   database fields
-   relationships
-   indexes
-   timestamps
-   archival flags

Models should **not contain workflow orchestration**.

------------------------------------------------------------------------

## Services

Services own **write‑side business logic**.

They answer:

> What rules must be enforced when data changes?

Examples:

-   create expense
-   update lease
-   archive tenant
-   enforce organization consistency

Example workflow:

``` mermaid
flowchart LR
Request --> Service
Service --> Validation
Validation --> Save
Save --> Database
```

Services prevent business rules from leaking into:

-   views
-   serializers
-   forms

------------------------------------------------------------------------

## Selectors

Selectors own **read‑side query composition**.

They answer:

> How should the system read data efficiently?

Selectors include:

-   optimized queries
-   joins
-   prefetches
-   annotations
-   grouped reporting

Example:

``` mermaid
flowchart LR
API --> Selector
Selector --> Query
Query --> Database
Database --> Result
Result --> API
```

Selectors prevent repeated queryset logic across the codebase.

------------------------------------------------------------------------

## Serializers

Serializers shape **API input and output**.

They answer:

> How does the API accept and present data?

### Write Serializers

Used for create/update operations.

Characteristics:

-   simple validation
-   primitive inputs
-   delegate logic to services

### Read Serializers

Used for frontend display.

Characteristics:

-   nested objects
-   computed fields
-   display labels
-   UI-friendly structures

------------------------------------------------------------------------

## Views

Views orchestrate **HTTP request handling**.

Responsibilities:

-   route request
-   call selectors for reads
-   call services for writes
-   choose serializer
-   return response

Views should remain **thin orchestration layers**.

------------------------------------------------------------------------

# Mixins

Mixins provide **reusable behaviors** shared across views.

Example uses:

-   organization scoping
-   permission helpers
-   soft deletion
-   query parameter parsing

Example:

``` python
class OrganizationScopedViewMixin:
    def get_organization(self):
        return self.request.organization
```

Used like:

``` python
class ExpenseViewSet(OrganizationScopedViewMixin, ModelViewSet):
    ...
```

------------------------------------------------------------------------

# Folder Structure

Recommended structure for serious domains:

    apps/
      expenses/
        models.py
        choices.py
        services.py
        urls.py

        selectors/
            expense_queryset.py
            expense_list_selectors.py
            expense_detail_selectors.py
            expense_reporting_selectors.py
            lookup_selectors.py

        serializers/
            expense_read_serializers.py
            expense_write_serializers.py
            category_serializers.py
            vendor_serializers.py
            attachment_serializers.py

        views/
            mixins.py
            expense_views.py
            category_views.py
            vendor_views.py

This structure supports **large feature domains without turning files
into monsters**.

------------------------------------------------------------------------

# Request Flow Example

``` mermaid
sequenceDiagram

participant Client
participant View
participant Serializer
participant Service
participant DB

Client->>View: POST /expenses
View->>Serializer: Validate input
Serializer->>Service: Create expense
Service->>DB: Save record
DB-->>Service: Saved
Service-->>Serializer: Expense object
Serializer-->>View: Serialized response
View-->>Client: JSON Response
```

------------------------------------------------------------------------

# Multi‑Tenant Safety

Every layer must respect **organization boundaries**.

Best practices:

-   models are org‑owned
-   services validate org consistency
-   selectors filter by org first
-   views resolve org from request
-   serializers never trust cross‑org ids

Example rule:

> No query should ever return records from another organization.

------------------------------------------------------------------------

# Audit‑Friendly Design

For operational systems, auditability is critical.

Recommended features:

-   explicit statuses
-   archive flags instead of hard delete
-   created_at / updated_at timestamps
-   deterministic validation
-   integrity inspection commands

Future audit tooling can inspect:

-   orphan relationships
-   inconsistent states
-   suspicious duplicates

------------------------------------------------------------------------

# AI‑Ready Architecture

AI systems must rely on **structured backend truth**.

Good signals for AI analysis:

-   category
-   vendor
-   expense date
-   building scope
-   lease scope
-   status
-   payment state

AI should:

-   explain trends
-   detect anomalies
-   summarize performance

AI should **never replace deterministic domain rules**.

------------------------------------------------------------------------

# When To Use This Architecture

Use this architecture when:

-   the system has real domain rules
-   reporting matters
-   the application will grow
-   multiple endpoints share data
-   the product is multi‑tenant
-   auditability is required

Avoid over‑engineering tiny prototypes.

------------------------------------------------------------------------

# Design Philosophy

Good backend architecture should allow a developer to quickly answer:

-   Where is the data stored?
-   Where do write rules live?
-   How are reads composed?
-   How is the API shaped?
-   Where are tenant boundaries enforced?

If those answers are obvious when reading the codebase, the architecture
is working.

------------------------------------------------------------------------

# Final Principle

> Build backend systems so the code explains the domain.

That means:

-   explicit naming
-   small focused modules
-   deterministic business rules
-   reusable query patterns
-   safe multi‑tenant enforcement

This architecture supports systems that remain maintainable **years
after they are built**.
