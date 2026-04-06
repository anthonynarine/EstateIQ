# 06 — Verification and Quality Bar

## Why verification exists

Seeding rows is not enough.

The seeded dataset must prove the product story:
- vacancy is real
- turnover is real
- healthy ledgers are healthy
- delinquent ledgers are delinquent
- ledger activity is dense enough to validate UI and product behavior

## Current checks

The verification layer currently checks:
- no unit has more than one active lease
- selected vacant units have no active lease
- turnover unit has expected history
- selected healthy leases verify to zero balance
- selected partial/delinquent leases verify to positive balance
- sample ledgers have real activity

## Current quality bar

A successful seed run should mean:
- the command completes
- verification passes
- the demo org is usable immediately for UI walkthroughs

## Why command failure on failed verification is good

If verification fails, the command should fail.

That keeps the dataset honest and prevents developers from assuming seeded history is correct when it is not.

## Future verification extensions

As expenses are added, extend verification to prove:
- expense rows exist across intended scopes
- recurring cost density exists for selected buildings
- lease-scoped expenses align with real lease/unit/building chains
- known reporting assumptions hold
