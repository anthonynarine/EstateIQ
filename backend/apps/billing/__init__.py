# Filename: backend/apps/billing/__init__.py

"""
Billing domain package.

This package contains the lease-ledger and billing functionality for EstateIQ.

Compatibility note:
Some tests and internal imports still resolve through `apps.billing.views...`
while the billing view layer is being refactored from a monolithic module into
a package. We expose `views` lazily via `__getattr__` so those dotted import
paths continue to work without forcing eager imports during package loading.
"""

from __future__ import annotations

from importlib import import_module
from types import ModuleType


def __getattr__(name: str) -> ModuleType:
    """
    Lazily expose selected billing subpackages.

    Args:
        name: Attribute name being accessed on the package.

    Returns:
        ModuleType: Imported submodule for supported names.

    Raises:
        AttributeError: If the requested attribute is not supported.
    """
    # Step 1: lazily expose the split billing views package
    if name == "views":
        return import_module("apps.billing.views")

    # Step 2: fail normally for any other unknown attribute
    raise AttributeError(f"module 'apps.billing' has no attribute '{name}'")


__all__ = ["views"]