# 07 — Developer Guide

## How to work on this app safely

### Rule 1: add scenario data first
Do not hardcode new business-story behavior directly into builders if it belongs in a deterministic scenario file.

### Rule 2: keep builders small and focused
Each builder should own one concern.

### Rule 3: respect domain boundaries
If billing already has a service for a behavior, prefer using it instead of bypassing the domain with ad hoc record creation.

### Rule 4: preserve determinism
Avoid randomness. Use fixed names, dates, amounts, and references.

### Rule 5: extend verification whenever you add a new layer
New seeded behavior should come with verification for the intended story.

## Current build sequence for new layers

When adding a new seeded domain layer:
1. create scenario definitions
2. create the builder
3. wire it into orchestration
4. extend command output
5. extend verification
6. rerun seed and validate output

## How to read the current app

Start with:
1. `seed_demo_portfolio.py`
2. `seed_service.py`
3. `verification.py`
4. the specific builder you want to change
5. the matching scenario file

## Recommended next evolution

Short term:
- add `expenses.py`
- add `expense_builder.py`
- extend verification

Mid term:
- add reset service
- add more explicit docs for scenario stories by unit/building
- add smoke-test support around the seeded demo org
