# Filename: backend/apps/demo_data/constants.py

from __future__ import annotations

from datetime import date


# Step 1: demo org identity
DEMO_ORG_NAME = "Demo Portfolio LLC"
DEMO_ORG_SLUG = "demo-portfolio"

# Step 2: demo owner identity
DEMO_OWNER_EMAIL = "demo.owner@portfolioos.local"
DEMO_OWNER_PASSWORD = "ChangeMe123!"
DEMO_OWNER_FIRST_NAME = "Demo"
DEMO_OWNER_LAST_NAME = "Owner"

# Step 3: deterministic history anchor
DEMO_AS_OF_DATE = date(2026, 4, 1)
DEMO_HISTORY_YEARS = 5

# Step 4: default seed behavior
DEFAULT_RESET = True