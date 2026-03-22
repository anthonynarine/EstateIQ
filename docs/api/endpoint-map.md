# Endpoint Map

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Organization

- `GET /org/me`
- `POST /org/invite`

## Properties

- `GET /buildings`
- `POST /buildings`
- `GET /buildings/:id`
- `PATCH /buildings/:id`
- `DELETE /buildings/:id`
- `POST /buildings/:id/units/bulk-create`

## Leasing

- `POST /tenants`
- `GET /tenants`
- `POST /leases`
- `POST /leases/:id/end`
- `GET /units/:id/occupancy`

## Billing / Ledger

- `POST /leases/:id/charges/generate-month`
- `POST /payments`
- `GET /leases/:id/ledger`
- `GET /reports/delinquency`

## Expenses

- `POST /expenses`
- `GET /expenses`
- `POST /expenses/:id/attachments`

## Reporting

- `GET /reports/cashflow`
- `GET /reports/export/year-end`
