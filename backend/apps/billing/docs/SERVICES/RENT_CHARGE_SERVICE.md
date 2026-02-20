
# RentChargeService

## Responsibility

Generate a rent charge for a specific lease and month.

## Guarantees

- Idempotent per lease/month
- Validates lease term boundaries
- Atomic creation

## Failure Cases

- Lease outside active period
- Duplicate creation attempts
- Validation errors

