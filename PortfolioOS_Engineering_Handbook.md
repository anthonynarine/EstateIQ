
# PortfolioOS Engineering Handbook
## A Teaching Guide to Building a Production-Grade Multi-Tenant Rental SaaS
**Author:** OpenAI for Anthony Narine  
**Project Context:** React + TypeScript + Axios + TanStack Query frontend, Django + DRF + PostgreSQL backend

---

## How to Use This Handbook

This guide is written like an engineering book, not a reference cheat sheet.  
Read it in order the first time. After that, return to individual chapters while you build.

The goal is not just to help you finish features.

The goal is to help you understand **why production systems are shaped the way they are**, so that when you build buildings, units, tenants, leases, occupancy, and financial workflows, you are not guessing. You are making deliberate architectural decisions.

---

# Part 1 - Foundations

## Chapter 1 - What Is a Software System?

A software system is not just "frontend code" plus "backend code."

A software system is a set of cooperating parts that move information from one state to another under controlled rules.

In your rental SaaS, examples of real system behavior include:

- a landlord creates a building
- a unit becomes occupied because a lease becomes active
- a payment reduces the remaining balance of a rent charge
- a dashboard shows portfolio cash flow derived from ledger records
- a user from Organization A must never see data from Organization B

That means your system has to do four things well:

1. **Represent reality**  
   The database and domain model must describe the real business world clearly.

2. **Enforce rules**  
   The app must prevent impossible or dangerous states.

3. **Move data safely across boundaries**  
   The frontend, API, service layer, and database must communicate in well-defined shapes.

4. **Remain understandable as it grows**  
   The architecture must still make sense after dozens of models, endpoints, forms, and reports exist.

### A useful mental model

Think of your system as a pipeline:

```text
User Intent
   ↓
UI Interaction
   ↓
HTTP Request
   ↓
Validation
   ↓
Domain Logic
   ↓
Database State Change
   ↓
Serialized Response
   ↓
Frontend State Update
   ↓
Rendered UI
```

A junior developer often sees only the top and bottom of this pipeline:

- "the user clicked save"
- "the screen updated"

A stronger engineer sees all the boundaries in between.

That is what system design is: understanding the full path of truth.

---

## Chapter 2 - Client-Server Architecture

Your application uses a client-server model.

- The **client** is the React frontend.
- The **server** is the Django + DRF backend.
- The **database** is PostgreSQL.
- HTTP is the transport language between frontend and backend.

### High-level architecture

```text
Frontend (React + TypeScript)
   ↓
API Client (Axios)
   ↓
HTTP / JSON
   ↓
DRF View / ViewSet
   ↓
Serializer
   ↓
Service Layer
   ↓
ORM / PostgreSQL
```

### Why split the system this way?

Because each layer solves a different problem:

- **React** handles interaction and rendering.
- **Axios** sends requests and receives responses.
- **DRF views** translate HTTP into application actions.
- **Serializers** validate and shape data.
- **Services** enforce domain rules and coordinate business behavior.
- **PostgreSQL** stores durable truth.

When these responsibilities blur together, systems become fragile.

For example:
- if React contains business rules that the backend does not enforce, data becomes inconsistent
- if serializers contain all domain logic, your backend becomes hard to test and hard to reason about
- if views directly perform complex mutations, the code becomes procedural and unscalable

Good architecture is partly about separation of responsibilities, but even more about **preserving clarity of truth**.

---

## Chapter 3 - APIs and Contracts

An API is a controlled boundary between systems.

In your stack, the frontend does not access the database directly. It speaks to the backend through HTTP requests and JSON payloads.

That means the most important thing at the boundary is the **contract**.

A contract answers questions like:

- What URL do I call?
- Which HTTP method is allowed?
- What fields can I send?
- Which fields will I get back?
- Which validations exist?
- What errors can happen?
- Which fields are required versus optional?
- Which values are computed by the server?

### Contract thinking changes how you build

Beginners often think:
> "I need to send some data to the backend."

A stronger engineer thinks:
> "I am constructing a write contract that the backend validates and converts into domain actions."

That difference matters.

A contract is not just "some JSON."  
A contract is the formal shape of communication between independent parts of the system.

### Example: creating a lease

Write contract:

```json
{
  "unit_id": 42,
  "start_date": "2026-03-01",
  "end_date": null,
  "rent_amount": "2400.00",
  "deposit_amount": "2400.00",
  "due_day": 1,
  "parties": [
    {
      "tenant_id": 10,
      "role": "primary"
    }
  ]
}
```

Read contract:

```json
{
  "id": 88,
  "unit": {
    "id": 42,
    "label": "2B",
    "building": {
      "id": 7,
      "name": "Maple Street"
    }
  },
  "start_date": "2026-03-01",
  "end_date": null,
  "rent_amount": "2400.00",
  "deposit_amount": "2400.00",
  "due_day": 1,
  "status": "active",
  "parties_detail": [
    {
      "tenant": {
        "id": 10,
        "full_name": "Jamie Carter",
        "email": "jamie@example.com"
      },
      "role": "primary"
    }
  ]
}
```

These shapes are different on purpose.

You will study that more deeply later, but for now understand this:

- the **write contract** is optimized for safe mutation
- the **read contract** is optimized for useful display

Enterprise systems intentionally separate those concerns.

---

## Chapter 4 - JSON, Serialization, and Deserialization

The frontend and backend do not send Python objects or React objects across the network.  
They send serialized text, usually JSON.

### Serialization

Serialization means turning an internal object into a transport-safe representation.

Example:
- Python `Lease` model instance
- converted into JSON response body

### Deserialization

Deserialization means taking external input and converting it into validated internal data.

Example:
- JSON request body from React
- converted into serializer validated data
- then converted into domain actions

### Why this layer matters

Because transport data is untrusted.

Never forget this rule:

> Everything coming from the client is a claim until the server validates it.

That is why serializers exist.

### Example

A React form may send:

```json
{
  "unit_id": 42,
  "rent_amount": "-200"
}
```

The browser can send it. Axios can send it.  
That does not make it valid.

Only after backend validation can the system treat it as meaningful.

So serialization is not just formatting. It is part of trust management.

---

# Part 2 - REST Architecture

## Chapter 5 - Resources and REST Thinking

REST is not magic. It is a disciplined way to model application entities as network resources.

In your system, common resources include:

- organizations
- buildings
- units
- tenants
- leases
- charges
- payments
- expenses

Each resource usually has:

- a collection endpoint, such as `/api/v1/buildings/`
- a detail endpoint, such as `/api/v1/buildings/7/`

### Typical operations

```text
GET    /buildings/       -> list buildings
POST   /buildings/       -> create building
GET    /buildings/7/     -> retrieve one building
PATCH  /buildings/7/     -> partially update building
DELETE /buildings/7/     -> delete or soft-delete building
```

### Why resource orientation helps

Because it gives the system consistency.

A team can predict how new endpoints should behave.  
The frontend can reason about operations cleanly.  
Testing becomes easier because patterns repeat.

### But real business systems need more than CRUD

Rental SaaS is not just CRUD.

Examples:
- end a lease
- generate rent charges for a month
- fetch current occupancy for a unit
- produce delinquency reports

These are still valid REST-style operations, but they often use action endpoints or computed-report endpoints.

Examples:

```text
POST /leases/:id/end
POST /leases/:id/charges/generate-month
GET  /units/:id/occupancy
GET  /reports/delinquency?as_of=2026-03-01
```

That is normal.  
A mature REST system mixes standard CRUD with carefully designed domain actions.

---

## Chapter 6 - HTTP Verbs and Their Meaning

HTTP verbs are not just syntax. They communicate intent.

### GET
Read data. Should not mutate state.

### POST
Create a new resource or trigger an action.

### PATCH
Partially update a resource.

### PUT
Replace an entire resource. Less common in modern SPAs unless done deliberately.

### DELETE
Delete a resource or mark it deleted.

### Why verb choice matters

Because APIs are easier to reason about when transport semantics match domain semantics.

Bad:
- `POST /buildings/7/getData`

Better:
- `GET /buildings/7/`

Bad:
- `POST /leases/7/update-status`

Better:
- `PATCH /leases/7/`
- or `POST /leases/7/end` if ending a lease is a domain action with special rules

### Rule of thumb

Use plain CRUD endpoints for plain resource edits.  
Use action endpoints when the operation represents a domain transition, not just field replacement.

Ending a lease is not "just updating end_date."  
It is a lifecycle transition that may require:
- validation against start date
- occupancy recalculation
- audit logging
- charge generation or cutoff logic
- domain invariants

That is why action endpoints are often healthier than overloading generic update endpoints.

---

## Chapter 7 - Read Contracts vs Write Contracts

This is one of the most important architectural concepts in this book.

A system becomes much cleaner when it stops pretending that read shapes and write shapes should be identical.

### Write contracts

Write contracts exist to mutate the system safely.

They are usually:
- flatter
- ID-oriented
- strict
- validation-focused

Example:

```json
{
  "unit_id": 42,
  "start_date": "2026-03-01",
  "parties": [
    {
      "tenant_id": 10,
      "role": "primary"
    }
  ]
}
```

### Read contracts

Read contracts exist to help the UI display meaningful information.

They are usually:
- richer
- more nested
- more descriptive
- sometimes computed

Example:

```json
{
  "id": 88,
  "unit": {
    "id": 42,
    "label": "2B",
    "building": {
      "id": 7,
      "name": "Maple Street",
      "address": "123 Maple Street"
    }
  },
  "status": "active",
  "is_current": true,
  "parties_detail": [
    {
      "tenant": {
        "id": 10,
        "full_name": "Jamie Carter",
        "phone": "555-1234"
      },
      "role": "primary"
    }
  ]
}
```

### Why are they different?

Because these jobs are different.

The backend does not need a full nested building object in order to create a lease.  
It only needs a valid `unit_id`.

The frontend does need nested human-readable data in order to render pages and cards.

### The common beginner mistake

Trying to use one mega-serializer for both input and output.

This usually causes:
- awkward validation logic
- hard-to-maintain serializer code
- over-fetching
- under-expressive responses
- brittle frontend assumptions

The cleaner pattern is:

```text
Write Contract
   ↓
Input Serializer
   ↓
Service Layer
   ↓
Models / Transaction
   ↓
Output Selector / Output Serializer
   ↓
Read Contract
```

This pattern is one of the clearest ways to scale complexity without losing control.

---

# Part 3 - Frontend Architecture

## Chapter 8 - UI State vs Domain State

A major skill jump happens when you stop treating all state as the same kind of state.

Not all state belongs in the same place.

### UI state

UI state controls presentation and interaction.

Examples:
- whether a modal is open
- which tab is selected
- whether a drawer is expanded
- form field text before submit
- which row is highlighted

This state is local and temporary.

### Domain state

Domain state represents actual business truth from the backend.

Examples:
- the list of buildings
- whether a unit is occupied
- the current lease for a unit
- tenant records
- ledger balances
- delinquency results

This state is not "just UI."  
It is the current known state of the business domain.

### Why this distinction matters

If you mix UI state and domain state carelessly, you get confusing components and bad caching logic.

For example:
- modal open/close state belongs in the component or a UI store
- lease detail data belongs in TanStack Query cache
- form draft values may begin as UI state but become a write contract on submit

### Helpful mental model

```text
UI State = how the screen behaves
Domain State = what the business world currently is
```

This is why TanStack Query is so powerful.  
It is not just a fetch library. It is a system for synchronizing frontend knowledge with server truth.

---

## Chapter 9 - The API Client Layer with Axios

Your Axios layer should be thin but deliberate.

The purpose of an API client is to centralize HTTP concerns so that React components do not become network code soup.

### Responsibilities of the Axios layer

- base URL configuration
- auth header or cookie handling
- org header injection if needed
- response normalization
- structured error handling
- optional retry/refresh logic

### Example API client

```ts
// # Filename: src/api/client.ts
// ✅ New Code

import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Feature API module example

```ts
// # Filename: src/features/leases/api/leasesApi.ts
// ✅ New Code

import { apiClient } from "../../../api/client";

export interface LeasePartyWrite {
  tenant_id: number;
  role: "primary" | "co_tenant";
}

export interface CreateLeaseInput {
  unit_id: number;
  start_date: string;
  end_date: string | null;
  rent_amount: string;
  deposit_amount: string;
  due_day: number;
  parties: LeasePartyWrite[];
}

export interface LeaseReadModel {
  id: number;
  start_date: string;
  end_date: string | null;
  rent_amount: string;
  deposit_amount: string;
  due_day: number;
  status: string;
  unit: {
    id: number;
    label: string;
    building: {
      id: number;
      name: string;
    };
  };
  parties_detail: Array<{
    role: string;
    tenant: {
      id: number;
      full_name: string;
      email: string | null;
    };
  }>;
}

export async function createLease(
  payload: CreateLeaseInput,
): Promise<LeaseReadModel> {
  const response = await apiClient.post<LeaseReadModel>("/leases/", payload);
  return response.data;
}
```

### Why put this in a module?

Because components should express intent, not transport plumbing.

Bad component code:
- manually builds URLs
- manually parses errors
- manually handles headers
- repeats endpoint shapes everywhere

Good component code:
- calls `createLease(payload)`
- handles success or failure
- stays focused on user interaction

That is architectural leverage.

---

## Chapter 10 - TanStack Query and Server-State Synchronization

TanStack Query exists because server state has different needs than local component state.

It helps solve problems like:
- fetching
- caching
- deduping
- background refetching
- invalidation after writes
- synchronization across screens

### Example: lease list query

```ts
// # Filename: src/features/leases/hooks/useLeases.ts
// ✅ New Code

import { useQuery } from "@tanstack/react-query";
import { listLeases } from "../api/leasesApi";

export function useLeases(orgSlug: string) {
  return useQuery({
    queryKey: ["leases", orgSlug],
    queryFn: async () => await listLeases(orgSlug),
  });
}
```

### Example: create mutation with invalidation

```ts
// # Filename: src/features/leases/hooks/useCreateLease.ts
// ✅ New Code

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLease } from "../api/leasesApi";

export function useCreateLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLease,
    onSuccess: async (newLease) => {
      await queryClient.invalidateQueries({ queryKey: ["leases"] });
      await queryClient.invalidateQueries({
        queryKey: ["unit", newLease.unit.id, "occupancy"],
      });
    },
  });
}
```

### Why invalidation matters

Because after a successful write, your old cached reads may now be stale.

If a lease is created:
- lease lists may be stale
- unit occupancy may be stale
- building occupancy summary may be stale
- dashboard counts may be stale

A mature frontend understands that writes have ripple effects.

### System thinking view

```text
Create Lease Mutation
   ↓
Lease collection changed
   ↓
Unit occupancy changed
   ↓
Building summary may change
   ↓
Dashboard counts may change
```

This is why frontend architecture must understand the domain, not just the endpoint.

---

## Chapter 11 - Forms, Draft State, and Mutation Boundaries

Forms are where UI state and domain mutation meet.

A form begins as temporary local state:
- text inputs
- selects
- toggles
- date values

On submit, it becomes a write contract.

That boundary is important.

### Example form mental model

```text
Input fields
   ↓
Draft state
   ↓
Submit handler
   ↓
Write contract mapping
   ↓
Mutation function
   ↓
Server validation
```

### Why explicit mapping is good

Because the form shape is often not identical to the API shape.

Example:
- the UI may store selected tenant option objects
- the API wants `tenant_id`
- the UI may allow separate "create tenant" mode and "select tenant" mode
- the backend still wants one normalized `parties` list

So your submit handler should intentionally translate UI state into contract state.

That translation step is where architecture becomes explicit instead of accidental.

---

# Part 4 - Backend Architecture

## Chapter 12 - Django Models as Domain Structure

Django models describe the durable structure of the business world.

In PortfolioOS, important models include:

- Organization
- Building
- Unit
- Tenant
- Lease
- LeaseParty
- Charge
- Payment
- Allocation
- Expense

Models should answer the question:

> What entities exist, and how are they related?

They should not answer every question about how business workflows happen.  
That is a service-layer responsibility.

### Example simplified models

```py
# Filename: apps/leasing/models.py
# ✅ New Code

from django.db import models


class Tenant(models.Model):
    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="tenants",
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)


class Lease(models.Model):
    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="leases",
    )
    unit = models.ForeignKey(
        "properties.Unit",
        on_delete=models.PROTECT,
        related_name="leases",
    )
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    rent_amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_day = models.PositiveSmallIntegerField()


class LeaseParty(models.Model):
    class Role(models.TextChoices):
        PRIMARY = "primary", "Primary"
        CO_TENANT = "co_tenant", "Co-Tenant"

    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name="parties",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="lease_links",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
```

### What models should do well

- define relationships
- define database-level constraints
- represent durable truth
- support queries

### What models should not become

- giant dumping grounds for every business workflow
- places where HTTP concerns leak in
- places where unrelated domain rules pile up chaotically

A healthy model layer is crisp, not overloaded.

---

## Chapter 13 - Serializers: Validation and Representation

DRF serializers sit at the boundary between transport data and application data.

They are useful for:
- validating request payloads
- coercing types
- shaping response data

But serializers should not become the entire business layer.

### Input serializer example

```py
# Filename: apps/leasing/api/serializers.py
# ✅ New Code

from rest_framework import serializers


class LeasePartyWriteSerializer(serializers.Serializer):
    tenant_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=["primary", "co_tenant"])


class LeaseCreateSerializer(serializers.Serializer):
    unit_id = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    due_day = serializers.IntegerField(min_value=1, max_value=28)
    parties = LeasePartyWriteSerializer(many=True)

    def validate(self, attrs):
        parties = attrs.get("parties", [])
        primary_count = sum(1 for party in parties if party["role"] == "primary")

        if primary_count != 1:
            raise serializers.ValidationError(
                "A lease must have exactly one primary tenant."
            )

        return attrs
```

### What serializers are great at

- ensuring fields exist
- validating primitive shapes
- validating local request-level rules
- formatting response data

### What serializers are bad at when overused

- coordinating multi-model workflows
- handling complex transactions
- enforcing business invariants across many records
- owning the full lifecycle of domain actions

That is why advanced systems move the core logic into services.

---

## Chapter 14 - Views and ViewSets: Thin Controllers

Views should translate HTTP into application calls.

That means a view should usually do only a few things:

1. authenticate and authorize
2. resolve request context like organization
3. validate input using a serializer
4. call the appropriate service
5. serialize the response
6. return HTTP response

### Example

```py
# Filename: apps/leasing/api/views.py
# ✅ New Code

from rest_framework import status, viewsets
from rest_framework.response import Response

from .serializers import LeaseCreateSerializer, LeaseReadSerializer
from ..services.lease_lifecycle import create_lease


class LeaseViewSet(viewsets.ViewSet):
    def create(self, request):
        serializer = LeaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lease = create_lease(
            org=request.org,
            actor=request.user,
            data=serializer.validated_data,
        )

        output = LeaseReadSerializer(lease)
        return Response(output.data, status=status.HTTP_201_CREATED)
```

### Why thin views are healthier

Because views are transport adapters, not business brains.

When views become fat, the same problems appear:
- hard to test
- repeated logic across endpoints
- coupling HTTP concerns to domain rules
- poor readability

The view should read like orchestration, not like a novel.

---

## Chapter 15 - The Service Layer

This is one of the most important backend patterns in your app.

A service layer contains business logic that coordinates domain actions.

Examples:
- create a lease and its lease parties
- end a lease safely
- generate monthly rent charges
- allocate a payment across charges
- compute reporting summaries

### Why services exist

Because business logic often spans:
- multiple models
- multiple validations
- transaction boundaries
- audit logging
- side effects

That logic is too important to bury in serializers or views.

### Example service

```py
# Filename: apps/leasing/services/lease_lifecycle.py
# ✅ New Code

from django.db import transaction
from django.db.models import Q

from apps.leasing.models import Lease, LeaseParty
from apps.properties.models import Unit
from apps.tenants.models import Tenant


@transaction.atomic
def create_lease(*, org, actor, data):
    unit = Unit.objects.select_for_update().get(
        organization=org,
        id=data["unit_id"],
    )

    overlapping_exists = Lease.objects.filter(
        organization=org,
        unit=unit,
        end_date__isnull=True,
    ).exists()

    if overlapping_exists:
        raise ValueError("Unit already has an active lease.")

    lease = Lease.objects.create(
        organization=org,
        unit=unit,
        start_date=data["start_date"],
        end_date=data.get("end_date"),
        rent_amount=data["rent_amount"],
        deposit_amount=data["deposit_amount"],
        due_day=data["due_day"],
    )

    tenant_ids = [party["tenant_id"] for party in data["parties"]]
    tenants = {
        tenant.id: tenant
        for tenant in Tenant.objects.filter(
            organization=org,
            id__in=tenant_ids,
        )
    }

    for party in data["parties"]:
        tenant = tenants.get(party["tenant_id"])
        if tenant is None:
            raise ValueError("Tenant does not belong to organization.")

        LeaseParty.objects.create(
            lease=lease,
            tenant=tenant,
            role=party["role"],
        )

    return lease
```

### What this service is doing architecturally

- resolves org-scoped records
- locks the unit row for safety
- checks domain invariants
- creates the lease
- creates related lease parties
- guarantees atomicity

This is service-layer architecture in practice.

---

## Chapter 16 - Selectors and Query Shaping

As systems grow, read logic often becomes complex enough to deserve its own layer.

Selectors are read-focused query functions.

Examples:
- fetch building detail with derived occupancy summary
- fetch current lease for a unit
- fetch lease ledger with charges and allocations
- fetch delinquency view

### Why selectors help

Because read behavior has its own complexity:
- annotations
- prefetching
- nested joins
- computed flags
- performance tuning

If you mix all of that into views, you get unreadable code fast.

### Mental model

```text
Services = write-side business behavior
Selectors = read-side query shaping
```

That separation is powerful in enterprise systems.

---

# Part 5 - Domain Modeling

## Chapter 17 - Modeling the Rental SaaS Domain

A domain model is the structured representation of the real world your software is trying to manage.

For PortfolioOS, a simplified relationship ladder looks like this:

```text
Organization
   ↓
Building
   ↓
Unit
   ↓
Lease
   ↓
LeaseParty
   ↓
Tenant
```

### Why model it this way?

Because the world is not "a unit has a tenant."  
That sounds simple, but it destroys history.

The real world is:

- a unit may be vacant
- a unit may have different tenants over time
- a lease is the legal occupancy agreement
- a lease may involve multiple people
- a tenant can appear in more than one lease over time

That means the system should model **relationships through time**, not just current snapshots.

### The crucial chain

```text
Unit
  ↓
Active Lease
  ↓
LeaseParty
  ↓
Tenant
```

This is the architecture that preserves correctness.

### Why not store `tenant_id` directly on `Unit`?

Because then you lose:
- lease history
- move-in / move-out periods
- roommate relationships
- occupancy by date
- rent and deposit terms linked to occupancy periods

A direct `Unit -> Tenant` shortcut seems easier at first, but it corrupts the domain over time.

The healthier model is:
- unit occupancy is derived from active lease
- lease parties define who is attached to the lease
- tenant identity remains separate from lease lifecycle

That is how you prevent data corruption.

---

## Chapter 18 - Occupancy Is Derived, Not Manually Toggled

One of the best architectural decisions in a rental system is making occupancy derived from leases rather than stored as an editable boolean.

Bad pattern:

```text
Unit.is_occupied = true
Unit.current_tenant_name = "Jamie"
```

This creates drift immediately.

What happens when:
- the lease ends but the boolean is not updated?
- a new lease starts but current tenant name was never replaced?
- historical occupancy needs reporting?
- roommates exist?

### Correct pattern

```text
Unit occupancy = does an active lease exist?
```

That makes occupancy computed domain state.

### Why this is so important

Because derived truth is harder to corrupt than duplicated truth.

Any time you duplicate domain truth in multiple places, the system will eventually disagree with itself.

---

## Chapter 19 - LeaseParty Exists for a Reason

A lot of developers initially ask:
> Why not just put `tenant_id` on the lease?

Because a lease may involve:
- one primary tenant
- multiple co-tenants
- future role expansion
- possible signer distinctions later

`LeaseParty` is a join model with business meaning.

It is not just technical normalization.  
It is a domain concept.

### Example

```text
Lease #88
  ├─ Jamie Carter (primary)
  └─ Alex Nguyen (co_tenant)
```

With `LeaseParty`, that relationship is explicit.

This structure supports:
- exactly one primary tenant invariant
- future roommate support
- reporting on lease participants
- clean historical records

This is how a good domain model stays extensible without becoming messy.

---

# Part 6 - Data Integrity and Transactions

## Chapter 20 - Domain Invariants

A domain invariant is a rule that must always be true if the system is healthy.

Examples in PortfolioOS:

- a lease must belong to exactly one organization
- a unit can have at most one active lease at a time
- a lease must have exactly one primary tenant
- allocations cannot exceed payment amount
- allocations cannot exceed a charge's remaining balance
- a tenant from one organization cannot be attached to another organization's lease

These are not "nice-to-have validations."  
They are structural truths.

### Why invariants matter

If invariants are weak, your data becomes politically true instead of mathematically true.

That means:
- support becomes painful
- reporting becomes unreliable
- AI explanations become untrustworthy
- downstream features become unstable

Enterprise software succeeds by protecting invariants aggressively.

---

## Chapter 21 - Atomic Operations and Transaction Boundaries

A transaction groups multiple database operations into one all-or-nothing unit.

### Example: create lease transaction

Creating a lease is not one write. It may include:

1. validating the unit
2. checking overlapping active lease rules
3. creating the lease row
4. creating lease party rows
5. writing audit logs
6. possibly creating initial charges later

If step 3 succeeds but step 4 fails, the system must not keep a half-created lease.

That is why transactions matter.

### Mental model

```text
Begin Transaction
   ↓
Validate domain state
   ↓
Write lease
   ↓
Write lease parties
   ↓
Commit
```

If any step fails:

```text
Rollback everything
```

### Why this protects correctness

Because the database should never record incomplete domain transitions as truth.

Partial truth is corruption.

---

## Chapter 22 - Database Integrity vs Application Integrity

You need both.

### Database integrity
Enforced by:
- foreign keys
- unique constraints
- check constraints
- indexes
- transaction isolation

### Application integrity
Enforced by:
- serializers
- services
- permissions
- org scoping
- domain invariant checks

### Example

A foreign key can ensure `lease_id` points to a real lease.  
But it cannot fully enforce:
- no cross-org contamination
- exactly one primary tenant across a submitted parties list
- no overlapping active leases for a unit across time ranges

Those higher-order rules belong in application services and sometimes DB constraints where possible.

The strongest systems use both layers, not one or the other.

---

# Part 7 - API Contract Design

## Chapter 23 - Designing Write Contracts

A write contract should be optimized for correctness.

That usually means:
- explicit required fields
- IDs instead of nested full objects
- stable naming
- clear optional fields
- strict validation semantics

### Good lease create write contract

```json
{
  "unit_id": 42,
  "start_date": "2026-03-01",
  "end_date": null,
  "rent_amount": "2400.00",
  "deposit_amount": "2400.00",
  "due_day": 1,
  "parties": [
    {
      "tenant_id": 10,
      "role": "primary"
    }
  ]
}
```

### Why this is a strong write contract

- the backend resolves relationships safely
- the client cannot spoof nested tenant objects
- validation stays targeted
- payloads remain stable

The write contract says:
> "Here is the minimum data required for the server to perform a safe domain transition."

That is the right mindset.

---

## Chapter 24 - Designing Read Contracts

A read contract should be optimized for comprehension.

That means it can include:
- nested objects
- computed fields
- display-friendly labels
- derived summaries
- convenience structures

### Good lease read contract

```json
{
  "id": 88,
  "status": "active",
  "unit": {
    "id": 42,
    "label": "2B",
    "building": {
      "id": 7,
      "name": "Maple Street"
    }
  },
  "parties_detail": [
    {
      "role": "primary",
      "tenant": {
        "id": 10,
        "full_name": "Jamie Carter",
        "email": "jamie@example.com"
      }
    }
  ]
}
```

### Why not force the frontend to compose all of this itself?

Because the backend is the authority on domain relationships.

If the frontend has to reconstruct too much domain meaning from raw IDs, you increase:
- duplicated logic
- overfetching
- inconsistency between screens
- UI fragility

The backend should return a read model that matches how the UI needs to think about the domain.

---

## Chapter 25 - Why Requests and Responses Often Differ

This deserves to be stated as a rule:

> Inputs should be designed for safe mutation. Outputs should be designed for useful understanding.

That is why they differ.

### Lifecycle diagram

```text
Write Contract
   ↓
Backend Validation
   ↓
Domain Logic
   ↓
Database
   ↓
Read Contract
```

Trying to force one shape to do both jobs usually creates bad architecture.

---

# Part 8 - Multi-Tenant SaaS Architecture

## Chapter 26 - Organization Scoping

Multi-tenancy is one of the highest-risk architectural concerns in your platform.

The fundamental promise of a multi-tenant SaaS is:

> Every organization sees only its own data, always.

That promise must hold at every layer.

### Core rule

Every domain operation must be org-scoped.

Examples:
- building queries filtered by organization
- tenant selection filtered by organization
- lease creation only against org-owned unit and org-owned tenant
- reports computed only over current org data

### Request mental model

```text
Authenticated User
   ↓
Resolved Membership
   ↓
Resolved request.org
   ↓
Org-scoped queryset / service call
```

### Why this is not optional

Cross-tenant leakage is one of the most serious SaaS failures possible.

If org scoping is weak, everything else is compromised:
- privacy
- trust
- security
- legal exposure
- product credibility

---

## Chapter 27 - Where Tenant Isolation Must Be Enforced

Org isolation is not one check. It is a system-wide pattern.

### At the view layer
Resolve `request.org` and use it everywhere.

### At the serializer/service layer
Never trust IDs without org-bound lookup.

Bad:
```py
tenant = Tenant.objects.get(id=tenant_id)
```

Good:
```py
tenant = Tenant.objects.get(id=tenant_id, organization=org)
```

### At the queryset layer
All list and detail reads must be filtered by organization.

### At the test layer
You need tests proving one org cannot access another org's records.

### At the database/index layer
Hot queries often need composite indexes involving `organization_id`.

This is how multi-tenant correctness becomes habitual rather than fragile.

---

# Part 9 - Error Contracts

## Chapter 28 - Structured API Errors

A serious frontend should not depend on random string error messages.

It should consume structured error contracts.

Recommended shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Lease creation failed",
    "details": {
      "parties": [
        "A lease must have exactly one primary tenant."
      ]
    }
  }
}
```

### Why structured errors matter

Because the frontend may need to:
- show a toast for general failure
- show inline field errors
- branch behavior based on error codes
- log diagnostics
- keep consistent UX across features

### Useful error fields

- `code` -> machine-readable type
- `message` -> human-readable summary
- `details` -> field or rule-specific data

That is far better than:
- `"something went wrong"`
- raw Python exception text
- inconsistent serializer dumps across endpoints

---

## Chapter 29 - Frontend Consumption of Error Contracts

The frontend should normalize API errors into a consistent internal shape.

### Example helper

```ts
// # Filename: src/lib/apiErrors.ts
// ✅ New Code

import axios from "axios";

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function extractApiError(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data?.error;
    if (payload?.code && payload?.message) {
      return payload as ApiErrorShape;
    }
  }

  return {
    code: "unknown_error",
    message: "Something went wrong. Please try again.",
  };
}
```

### Why normalize here?

Because components should not understand every backend edge case individually.

A centralized error adapter keeps the UI cleaner and more consistent.

---

# Part 10 - Putting It All Together

## Chapter 30 - Full Lease Creation Lifecycle

Now we can walk the full path.

### End-to-end flow

```text
React Form
   ↓
Draft UI State
   ↓
Submit Handler
   ↓
Axios Request
   ↓
DRF View
   ↓
Input Serializer
   ↓
Service Layer
   ↓
Database Transaction
   ↓
Output Serializer / Read Model
   ↓
HTTP Response
   ↓
TanStack Query Cache Update / Invalidation
   ↓
React Re-render
```

### Step 1 - React form draft state

The user fills in:
- unit
- start date
- rent
- deposit
- due day
- primary tenant

This is still draft state, not domain truth.

### Step 2 - Submit handler maps to write contract

The form turns selection objects into IDs.

Example:

```ts
const payload = {
  unit_id: selectedUnit.id,
  start_date,
  end_date,
  rent_amount,
  deposit_amount,
  due_day,
  parties: [
    {
      tenant_id: selectedTenant.id,
      role: "primary",
    },
  ],
};
```

At this point the UI has created a write contract.

### Step 3 - Axios sends the HTTP request

The API client handles transport.  
The mutation function does not know about the database.  
It just sends a contract.

### Step 4 - DRF validates transport shape

The input serializer checks:
- required fields
- date parsing
- decimal format
- due day bounds
- one primary tenant rule

### Step 5 - Service layer enforces domain rules

The service checks:
- unit belongs to org
- tenant belongs to org
- no overlapping active lease
- transaction wraps all writes
- lease and parties are created together

This is the heart of correctness.

### Step 6 - Database commits or rolls back

If all rules pass, the transaction commits.

If anything fails, the transaction rolls back.

That protects the system from partial truth.

### Step 7 - Backend returns a read contract

The backend responds with a richer shape:
- lease ID
- nested unit info
- nested tenant details
- status fields

Now the frontend has a display-ready object.

### Step 8 - TanStack Query updates server-state knowledge

The mutation succeeds, so you invalidate:
- leases
- unit occupancy
- building summary
- any affected dashboards

### Step 9 - React re-renders against fresh truth

Now the UI displays new occupancy and lease state.

This is a full-stack domain transition.

---

## Chapter 31 - Why Enterprise Systems Are Designed This Way

You asked for the "why," not just the "how."

Here is the real answer.

Enterprise systems are designed this way because real business software must survive:

- growth in feature count
- growth in data volume
- multiple developers
- bug fixes months later
- compliance expectations
- reporting correctness
- customer trust requirements

The architecture patterns in this guide exist because they reduce chaos.

### Why not just move faster with shortcuts?

Because shortcuts often create hidden debt in these exact places:

- duplicated business logic
- inconsistent contract shapes
- weak org scoping
- mutable money truth
- hard-to-test code paths
- UI coupling to unstable backend details
- missing transaction boundaries

That debt does not stay small.  
It compounds.

### A mature system optimizes for these qualities

- correctness
- clarity
- composability
- testability
- auditability
- extensibility

Those are not abstract values.  
They directly affect product quality and speed over time.

---

# Part 11 - Practical Project Guidance for PortfolioOS

## Chapter 32 - Recommended Layer Responsibilities in Your Stack

Use this as a practical rulebook.

### React components
- render UI
- manage local interaction state
- call hooks
- avoid embedding transport logic or business rules

### Hooks + TanStack Query
- fetch server state
- manage mutations
- invalidate dependent queries
- keep cache semantics consistent

### Axios API modules
- define endpoint calls
- define request/response TypeScript contracts
- normalize transport details

### DRF views
- auth
- permissions
- request context
- serializer invocation
- service orchestration

### Serializers
- input validation
- response shaping
- local field-level rules

### Services
- domain actions
- transactions
- multi-model workflows
- invariants
- audit/event creation

### Selectors
- optimized query shaping
- read-model construction
- annotations/prefetching

### Models
- relationships
- constraints
- durable structure

### Database
- final storage truth
- indexes
- transaction engine
- relational enforcement

This layered shape gives you room to grow without everything collapsing into one giant file.

---

## Chapter 33 - Common Architectural Mistakes to Avoid

### Mistake 1: storing duplicated truth
Example:
- `Unit.is_occupied`
- `Lease.status`
- `current_tenant_name` on unit

If possible, derive instead of duplicate.

### Mistake 2: putting business logic in React only
The backend must remain the source of truth.

### Mistake 3: using one serializer for every purpose
Separate input and output concerns.

### Mistake 4: trusting IDs without org scoping
Every lookup must be tenant-safe.

### Mistake 5: treating transactions as optional
Multi-step writes must be atomic.

### Mistake 6: using raw strings for error handling everywhere
Structured error contracts are cleaner and more stable.

### Mistake 7: designing endpoints around pages instead of resources and actions
UI pages change often. Domain resources live longer.

---

## Chapter 34 - A Mental Checklist for Every New Feature

When you add a feature, ask:

1. What is the resource or domain action?
2. What is the write contract?
3. What is the read contract?
4. Which invariants must always hold?
5. Which org-scoping rules apply?
6. Which layers own which responsibilities?
7. Which data is UI state versus server state?
8. Which queries become stale after mutation?
9. Does this require a transaction?
10. What error contract should the frontend expect?

That checklist will make you much stronger as an architect.

---

# Conclusion

The point of a production-grade SaaS is not just to make screens work.

It is to build a system whose truth stays coherent as the business grows.

For PortfolioOS, that means:

- lease-driven occupancy
- ledger-first financial truth
- strict organization scoping
- explicit read and write contracts
- service-layer business logic
- transaction-protected domain transitions
- clear separation between UI state and domain state

When you understand these patterns deeply, you stop coding feature-by-feature in isolation.

You start building a system intentionally.

That is the shift from app builder to software architect.

---

# Appendix A - Reference Diagrams

## System communication diagram

```text
Frontend
   ↓
API Client
   ↓
HTTP
   ↓
DRF View
   ↓
Serializer
   ↓
Service Layer
   ↓
Database
```

## Write-to-read lifecycle

```text
Write Contract
   ↓
Backend Validation
   ↓
Domain Logic
   ↓
Database
   ↓
Read Contract
```

## Lease creation lifecycle

```text
React Form
   ↓
Axios request
   ↓
DRF serializer
   ↓
Service layer
   ↓
Database transaction
   ↓
Response serializer
   ↓
Frontend state update
```

## Rental domain structure

```text
Organization
   ↓
Building
   ↓
Unit
   ↓
Lease
   ↓
LeaseParty
   ↓
Tenant
```

## Occupancy chain

```text
Unit
  ↓
Active Lease
  ↓
LeaseParty
  ↓
Tenant
```

---

# Appendix B - Suggested Next Internal Repo Docs

After this handbook, your repo would benefit from:

1. `ARCHITECTURE_GUIDE.md`
   - distilled version of this handbook for the project repo

2. `API_STYLE_GUIDE.md`
   - endpoint naming
   - serializer conventions
   - error contract rules
   - read/write contract rules

3. `DOMAIN_INVARIANTS.md`
   - one active lease per unit
   - exactly one primary tenant
   - allocation limits
   - org isolation guarantees

4. `FRONTEND_DATA_FLOW.md`
   - TanStack Query keys
   - invalidation map
   - page-to-endpoint relationships

5. `LEASE_LIFECYCLE.md`
   - create lease
   - update lease
   - end lease
   - occupancy implications
   - billing implications

These docs together would make the project far easier to scale and contribute to.
