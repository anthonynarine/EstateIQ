# Security

## Multi-Tenant Safety

All queries filter by organization_id.
All endpoints require X-Org-Slug.

Cross-org access returns 403 or 404.

---

## Financial Integrity

No stored balances.
All balances derived from immutable events.
Allocations never exceed payment.
