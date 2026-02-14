# API Contracts — PortfolioOS (v1)

Date: 2026-02-13

This document defines stable endpoint shapes and conventions.

---

## Conventions

- Base: `/api/v1/`
- JSON only
- Pagination: cursor-based or page+page_size (choose one early)
- Errors: consistent error envelope
- All responses include `request_id` header (recommended)

---

## Auth

### POST `/auth/login`
Body:
- email
- password

Response:
- access_token
- refresh_token (or refresh cookie if cookie strategy)

### POST `/auth/refresh`
Response:
- new access_token

### POST `/auth/logout`
Action:
- revoke refresh token (blacklist)

---

## Organization

### GET `/org/me`
Returns:
- org info
- membership role

### POST `/org/invite`
Role-restricted (owner):
- invite email
- role

---

## Properties

### GET `/buildings`
### POST `/buildings`
### GET `/buildings/:id`
### PATCH `/buildings/:id`
### DELETE `/buildings/:id` (soft delete recommended)

### POST `/buildings/:id/units/bulk-create`
Body:
- `mode`: `"sequence"` | `"custom"`
- `count`: number (if sequence)
- `labels`: `["1A", "1B"]` (if custom)

---

## Leasing

### POST `/tenants`
### GET `/tenants`

### POST `/leases`
Body:
- unit_id
- start_date
- end_date (nullable)
- rent_amount
- deposit_amount
- due_day
- parties: `[{"tenant_id": "...", "role": "primary"}]`

### POST `/leases/:id/end`
Body:
- end_date
- reason (optional)

### GET `/units/:id/occupancy`
Computed:
- current lease (if active)
- history list

---

## Billing / Ledger

### POST `/leases/:id/charges/generate-month`
Body:
- month (YYYY-MM)

Creates rent charges for the month (idempotent per month).

### POST `/payments`
Body:
- lease_id
- amount
- paid_at
- method
- allocations: `[{"charge_id": "...", "amount": 500}]`

### GET `/leases/:id/ledger`
Returns:
- charges (with remaining balance)
- payments
- allocations
- computed balance

### GET `/reports/delinquency`
Query:
- as_of=YYYY-MM-DD

Returns:
- unpaid charges grouped by lease + aging bucket

---

## Expenses

### POST `/expenses`
### GET `/expenses?month=YYYY-MM&building_id=...`
### POST `/expenses/:id/attachments`
multipart upload

---

## Reporting

### GET `/reports/cashflow?month=YYYY-MM`
Returns:
- portfolio totals
- per-building totals
- categories

### GET `/reports/export/year-end?year=YYYY`
Returns:
- CSV export link or streamed CSV

---

## Error format (recommended)

```
{
  "error": {
    "code": "validation_error",
    "message": "Rent amount must be positive",
    "details": {}
  }
}
```
