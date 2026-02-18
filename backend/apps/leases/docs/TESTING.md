# 06 — Testing

## Org Isolation Tests

File:

- `apps/leases/tests/test_org_isolation.py`

Guarantees:

- Org A user cannot read Org B tenant (list excludes, retrieve 404)
- Org A user cannot create lease using Org B unit (400)
- Org A user cannot patch Org B lease (404)
- Org A user cannot delete Org B lease (404)

## Pagination-Aware Tests

List endpoints return paginated payloads. Tests should read:

- `resp.data["results"]`

or use a safe fallback:

```python
results = resp.data.get("results", resp.data)
```
