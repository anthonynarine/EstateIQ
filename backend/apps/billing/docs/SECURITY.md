
# 🔒 Security & Financial Integrity

## Multi-Tenant Safety

- All queries filter organization_id
- All endpoints require X-Org-Slug
- Cross-tenant access returns 403/404

## Financial Integrity

- No stored balances
- All balances derived
- No hidden state
- Allocations validated
- Idempotent operations

