# EstateIQ Expenses Test Commands

## Current failure fix

Your test run is failing before pytest executes any tests because `conftest.py` imports `APIRequestFactory` at module import time:

```python
from rest_framework.test import APIRequestFactory
```

That can fail when Django settings are not initialized yet.

### Fix

Update `apps/expenses/tests/conftest.py` so the import is lazy.

```python
"""Pytest fixtures for the expenses domain."""

from __future__ import annotations

import pytest

from .factories import (
    create_building,
    create_category,
    create_expense,
    create_lease,
    create_organization,
    create_unit,
    create_user,
    create_vendor,
)


@pytest.fixture
def api_rf():
    """Return a DRF API request factory."""
    from rest_framework.test import APIRequestFactory

    return APIRequestFactory()
```

## Preferred pytest setup

If you already use `pytest-django`, make sure your Django settings module is configured.

### Option A — command line

Replace `YOUR_PROJECT_SETTINGS` with your real settings path.

```powershell
pytest --ds=YOUR_PROJECT_SETTINGS apps/expenses/tests/selectors/test_reporting_selectors.py -q -x
```

### Option B — pytest.ini

Create or update `pytest.ini` in the backend root:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = YOUR_PROJECT_SETTINGS
python_files = tests.py test_*.py *_tests.py
```

Then you can run plain pytest commands without `--ds` each time.

## Recommended run order

### 1. Reporting selector tests first

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -q -x
```

### 2. Expense service tests

```powershell
pytest apps/expenses/tests/services/test_expense_write_service.py -q -x
pytest apps/expenses/tests/services/test_expense_archive_service.py -q -x
```

### 3. Reporting API tests

```powershell
pytest apps/expenses/tests/api/test_reporting_api.py -q -x
```

### 4. Expense CRUD API tests

```powershell
pytest apps/expenses/tests/api/test_expense_api.py -q -x
pytest apps/expenses/tests/api/test_lookup_api.py -q -x
```

### 5. Full expenses suite

```powershell
pytest apps/expenses/tests -q
```

## Helpful variants

### Stop on first failure

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -q -x
```

### Show printed output

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -q -s
```

### Run one named test

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -q -k summarize
```

### Verbose mode

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -vv
```

## If the next error is model/factory related

That usually means one of the related models has a required field the lightweight factory did not fill in.

Most likely candidates:
- custom user model required fields
- organization required fields
- building required fields
- unit required fields
- lease required fields

When that happens, fix the first failing factory and rerun the same single test file.

## Fastest debug loop

Use this exact command while stabilizing the suite:

```powershell
pytest apps/expenses/tests/selectors/test_reporting_selectors.py -q -x
```

Fix one failure at a time, then move to the next layer.
