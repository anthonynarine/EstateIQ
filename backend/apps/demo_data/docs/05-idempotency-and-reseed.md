# 05 — Idempotency and Reseed Strategy

## Why idempotency matters

A demo seed command must be rerunnable.

If reruns duplicate charges, payments, leases, or expenses, the seed system becomes untrustworthy.

## Current strategy

The current app uses deterministic anchors plus reconciliation behavior.

Examples:
- demo org by fixed slug
- demo owner by fixed email
- buildings by org + building name
- units by building + unit label
- leases by org + unit + start date
- primary payments by stable external reference

## Billing idempotency

Billing reruns rely on real billing-layer behavior:
- month charge generation returns existing records when already present
- primary payments use deterministic external references
- extra unapplied payments use deterministic external references

## Reset philosophy

The current implementation is reconciliation-driven.

A future enhancement can add an explicit `--reset` workflow that deletes seeded data and recreates it cleanly.

## Recommended reset scope

A future reset service should only target the deterministic demo org and should delete records in domain-safe order.
