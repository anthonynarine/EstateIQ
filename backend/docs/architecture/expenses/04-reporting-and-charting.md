# 04 — Reporting and Charting

## Why Reporting Has Its Own Surface

Reporting is not just another list endpoint.

CRUD endpoints answer:
- what records exist
- what does this expense look like
- can I create or update it

Reporting endpoints answer:
- what happened over time
- where money is going
- which building is carrying the most expense load
- how should the frontend render charts and KPI blocks

Those are different concerns, so the Expenses module now has a dedicated reporting view surface.

---

## Current Reporting View Surface

The reporting layer is exposed through a dedicated viewset:

- `ExpenseReportingViewSet`

Current endpoint family:

- `/api/v1/expense-reporting/monthly-trend/`
- `/api/v1/expense-reporting/by-category/`
- `/api/v1/expense-reporting/by-building/`
- `/api/v1/expense-reporting/dashboard/`

---

## Layer Ownership

### Reporting Views
Own HTTP orchestration for reporting endpoints.

### Reporting Selectors
Own grouped aggregation logic like:

- totals by month
- totals by category
- totals by building
- top-level KPI summaries

### Reporting Serializers
Own chart-ready JSON contracts.

### Reporting Service
Used only when multiple aggregates need to be assembled into one unified payload, such as a dashboard response.

---

## First Three Core Visualizations

### 1. Monthly Expense Trend
Purpose:
- line chart
- bar chart
- month-over-month spend review
- future anomaly overlays

Backend shape:
```json
[
  { "month": "2026-01", "amount": "4200.00" },
  { "month": "2026-02", "amount": "3900.00" }
]
```

### 2. Expense by Category
Purpose:
- spend distribution
- category leaderboard
- pie or horizontal bar chart

Backend shape:
```json
[
  { "category_id": 3, "category_name": "Repairs", "amount": "1800.00" },
  { "category_id": 5, "category_name": "Utilities", "amount": "950.00" }
]
```

### 3. Expense by Building
Purpose:
- compare properties
- identify cost-heavy properties
- feed building dashboard cards

Backend shape:
```json
[
  { "building_id": 7, "building_name": "Pen Ave", "amount": "5200.00" },
  { "building_id": 8, "building_name": "Oak St", "amount": "3100.00" }
]
```

---

## Dashboard Composition

The dashboard endpoint is the orchestration endpoint. It can bundle:

- summary KPI block
- monthly trend
- by-category chart
- by-building chart

That lets the frontend hydrate a reporting page with one request instead of stitching everything together itself.

Typical shape:

```json
{
  "summary": {
    "total_amount": "11000.00",
    "expense_count": 42,
    "average_amount": "261.90",
    "period_start": "2026-01-01",
    "period_end": "2026-03-31"
  },
  "charts": {
    "monthly_expense_trend": [],
    "expense_by_category": [],
    "expense_by_building": []
  }
}
```

---

## Filter Strategy

Reporting should support many of the same filters as expense CRUD, including:

- building
- unit
- lease
- category
- vendor
- status
- scope
- expense date range
- reimbursement fields
- search when useful

It can also support reporting-specific options like:

- `top_n`
- future granularity or grouping options

A strong default rule is to exclude archived expenses unless explicitly requested. That keeps dashboards aligned with live operational truth.

---

## Why This Matters for the Frontend

The frontend should not need to:

- group raw expense rows into chart buckets
- calculate totals on the client
- infer summary blocks
- merge multiple raw lists into chart contracts

The backend should hand over deterministic chart-ready data so the UI can focus on rendering.

---

## Reporting Diagram

See: `diagrams/expenses-reporting-flow.mmd`

## Architectural Payoff

This design gives EstateIQ a clean path toward:

- richer property dashboards
- portfolio health views
- expense anomaly detection
- AI explanation layers grounded in deterministic totals
