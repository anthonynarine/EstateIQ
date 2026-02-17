# Filename: apps/buildings/permissions.py
from __future__ import annotations

from shared.auth.permissions import IsOrgMember


class IsBuildingOrgMember(IsOrgMember):
    """Alias for clarity within the buildings domain."""
