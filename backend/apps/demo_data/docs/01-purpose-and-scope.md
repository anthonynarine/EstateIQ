# 01 — Purpose and Scope

## What the `demo_data` app is

The `demo_data` app is a dedicated infrastructure app responsible for creating a deterministic demo/staging dataset using the **real** project models.

It exists to support:
- product validation
- UI validation
- realistic walkthroughs
- seeded demo environments
- future reporting and AI fixture generation

## What the `demo_data` app is not

It is **not**:
- a domain owner for buildings, leases, billing, or expenses
- a replacement for tests
- a fake front-end mock data generator
- a long-term business logic home

## Why it is its own app

The app touches multiple domains:
- users
- core org/membership
- buildings
- leases
- billing
- expenses

That cross-domain orchestration responsibility is large enough that it should not live inside `core`.

Keeping it as a dedicated app gives:
- cleaner boundaries
- easier maintenance
- clearer onboarding for future developers
- a better home for handoffs, verification, and seed orchestration

## Current scope

At the current stage, `demo_data` owns:
- scenario definitions
- seed builders
- orchestration
- verification
- management command entrypoint

## Intended long-term role

The app should become the authoritative home for:
- local demo environment setup
- staging dataset bootstrapping
- QA scenario replay
- future AI/reporting seed fixtures
