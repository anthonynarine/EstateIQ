# 01 — Data Model

## Models

### Tenant

**Intent:** A person/business record with minimal PII.

Fields (minimal):

- `organization` (FK -> Organization) **required**
- `full_name` (string) **required**
- `email` (optional string)
- `phone` (optional string)
- timestamps: `created_at`, `updated_at`

### Lease

**Intent:** Agreement tying a Unit to tenancy terms.

Fields:

- `organization` (FK -> Organization) **required**
- `unit` (FK -> Unit) **required**
- `start_date` (date) **required**
- `end_date` (date, nullable)
- `rent_amount` (decimal) **required**
- `security_deposit_amount` (decimal, optional but recommended)
- `rent_due_day` (int 1–28, optional but recommended)
- `status` (enum: draft/active/ended)
- timestamps: `created_at`, `updated_at`

### LeaseTenant (join model)

**Intent:** Many-to-many between Lease and Tenant with a role.

Fields:

- `organization` (FK -> Organization) **required**
- `lease` (FK -> Lease) **required**
- `tenant` (FK -> Tenant) **required**
- `role` (enum, e.g., primary/co_tenant/guarantor)
- timestamps

## Critical Invariants (Enforced)

1) `Tenant.organization` is always `request.org`
2) `Lease.organization` is always `request.org`
3) `Lease.unit.organization == request.org` (validated in serializer)
4) `LeaseTenant.organization` is always `request.org`
5) `LeaseTenant.tenant.organization == request.org`
6) `LeaseTenant.lease.organization == request.org`

## Typical Read Shape

Lease includes `parties_detail`:

```json
{
  "id": 1,
  "unit": 12,
  "start_date": "2026-02-01",
  "end_date": null,
  "rent_amount": "1500.00",
  "security_deposit_amount": "500.00",
  "rent_due_day": 1,
  "status": "active",
  "parties_detail": [
    {
      "tenant": { "id": 7, "full_name": "John Doe", "email": "john@x.com", "phone": "555-1234" },
      "role": "primary"
    }
  ]
}
```
