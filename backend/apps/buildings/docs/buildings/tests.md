# tests/test_org_isolation.py

This test suite validates the most important invariant:

> A user in Org A cannot read or write Org B resources.

## What it tests

1. Cross-tenant read protection:
   - Org A user requests Building in Org B → returns **404**

2. Cross-tenant write protection:
   - Org A user attempts to create a Unit under Org B's Building → rejected (**400** or **404**)

## Why 404 vs 403?

Returning 404 prevents **existence leaks**:
- Attackers cannot infer that an id exists in another tenant.

This is achieved naturally by org-scoped querysets.
