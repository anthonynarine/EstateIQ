# 05 — Operations, Observability, and Security

## Org boundary

Every billing access is organization-scoped.

That means:

- views resolve the active organization
- queries are filtered by organization
- tests verify cross-org isolation
- report access requires active organization membership

## Logging

Billing should log operational events without leaking sensitive information.

Recommended log categories:

- payment created
- allocation completed
- rent charge created
- rent posting run completed
- dashboard summary computed
- delinquency report computed

Avoid logging:

- tokens
- passwords
- full sensitive free text
- raw request payloads unless carefully sanitized

## Audit events

Application logs are not the same as audit logs.

Audit logs should capture:

- who performed the action
- what record changed
- which org and lease it belonged to
- the monetary amount involved
- when it happened

Recommended billing audit event types:

- `billing.payment.created`
- `billing.allocation.created`
- `billing.charge.generated`
- `billing.charge.existing_returned`
- `billing.rent_posting.run_completed`

## Test standards

The billing app should maintain coverage around:

- org scoping
- ledger math
- idempotency
- allocation guardrails
- delinquency math
- dashboard summary behavior

## Production hardening checklist

- keep views thin
- use transactions for write-path money logic
- use row locking where concurrent allocation or generation can race
- ensure selector logic stays deterministic
- keep naming contracts honest
