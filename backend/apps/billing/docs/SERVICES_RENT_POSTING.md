# RentPostingService

Bulk current-month rent posting.

## Behavior

For each lease:
- Calls RentChargeService
- Captures non-fatal errors
- Continues processing

Returns summary:
- leases_processed
- charges_created
- charges_existing
- created_charge_ids
- errors[]

Safe to run multiple times.
