# Expenses Test Suite Drop-In Guide

Copy this folder's contents into:

```text
apps/expenses/tests/
```

Recommended final structure:

```text
apps/expenses/tests/
  conftest.py
  factories.py
  helpers.py
  selectors/
    test_reporting_selectors.py
  services/
    test_expense_write_service.py
    test_expense_archive_service.py
  api/
    test_reporting_api.py
    test_expense_api.py
    test_lookup_api.py
```

## What this suite covers first

- Reporting selector math and org isolation
- Expense write-service rules
- Archive/unarchive behavior
- Reporting API contract smoke tests
- Expense CRUD and attachments action smoke tests
- Category/vendor org-scoped lookup tests

## Important implementation note

The factory layer is intentionally lightweight and uses best-effort model field
introspection for `Organization`, `Building`, `Unit`, and `Lease` because those
model files were not part of the upload set.

You may need small field-name adjustments if your actual related models require
fields not covered by the helper defaults.

## Intentional test design decision

The API tests dispatch DRF ViewSet actions with `APIRequestFactory` and attach
`request.organization` directly. This keeps the suite focused on expense-domain
behavior instead of depending on project middleware wiring.
