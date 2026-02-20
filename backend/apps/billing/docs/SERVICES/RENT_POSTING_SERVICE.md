
# RentPostingService

Bulk rent generation for org.

## Strategy

- Iterate leases
- Atomic per lease
- Capture errors
- Continue processing

## Output

- leases_processed
- charges_created
- charges_existing
- created_charge_ids
- errors[]

Safe for repeated execution.
