# 02 — Request Lifecycle

## Why This Matters

One of the strengths of the EstateIQ backend is that requests follow a repeatable path. That consistency makes the system easier to reason about, test, and extend.

For the Expenses module, requests generally follow one of three flows:

- write flow
- read flow
- reporting flow

---

## 1. Write Flow

Write operations include:

- create expense
- update expense
- archive expense
- unarchive expense

### Typical Path

1. URL router resolves the endpoint
2. DRF viewset action is selected
3. organization is resolved from the request context
4. write serializer validates input shape
5. serializer builds a service payload
6. service executes business rules
7. validation service enforces cross-model consistency
8. database is updated
9. read serializer shapes the response

### Why This Split Is Strong

This structure prevents views from becoming bloated and keeps the most important business rules in a reusable service layer.

### Write Flow Diagram

See: `diagrams/expenses-request-flow.mmd`

---

## 2. Read Flow

Read operations include:

- list expenses
- retrieve expense detail
- list vendors
- list categories
- list attachments

### Typical Path

1. URL router resolves the endpoint
2. viewset resolves organization and filters
3. selector builds the query
4. database returns rows
5. read serializer shapes the API response
6. frontend receives a presentation-friendly contract

### Why Selectors Matter

Selectors keep query logic out of views. That is especially important once filtering, sorting, related data loading, and reporting support grow more complex.

---

## 3. Reporting Flow

Reporting operations include:

- monthly trend
- by category
- by building
- dashboard composition

### Typical Path

1. reporting route resolves to `ExpenseReportingViewSet`
2. reporting filters are normalized
3. reporting selectors compute grouped aggregates
4. reporting service optionally assembles a dashboard payload
5. reporting serializers shape chart contracts
6. frontend receives graph-ready data

### Why Reporting Is Separate

Reporting is a different API concern from CRUD. It uses grouped aggregates instead of record detail. Giving it its own viewset keeps the expense CRUD surface focused and leaves room for future dashboard growth.

---

## Lifecycle by Layer

### Routers
Responsible for URL registration and endpoint exposure.

### Viewsets
Responsible for HTTP orchestration, authentication, permissions, response shaping, and calling into selectors/services.

### Mixins
Responsible for organization resolution and shared query-param normalization.

### Serializers
Responsible for validating request bodies or shaping response contracts.

### Services
Responsible for business rules and mutations.

### Selectors
Responsible for reads and aggregate computation.

### Database
Responsible for persistence and relational integrity.

---

## Backend Philosophy Illustrated

A healthy expense request should read like this:

- the **view** decides *what kind of request this is*
- the **serializer** decides *whether the API shape is acceptable*
- the **service** decides *whether the business action is valid*
- the **selector** decides *how to read the data*
- the **database** persists the result

That discipline is what keeps the Expenses module maintainable as it grows.
