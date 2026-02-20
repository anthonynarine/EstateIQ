# RentChargeService

## Responsibility

Generate rent charge for lease for specific year/month.

## Guarantees

- Idempotent per (lease, year, month)
- Validates lease term
- Calculates due_date based on due_day logic
- Atomic creation

## Public Method

generate_monthly_rent_charge(lease_id, year, month, created_by_id)

Returns:
- created (bool)
- charge_id
- due_date
