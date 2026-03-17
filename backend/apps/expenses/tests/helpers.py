"""Shared helpers for expenses-domain tests."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def assert_decimal_equal(left: Any, right: Any) -> None:
    """Assert two decimal-like values are equal at two-decimal precision."""
    left_decimal = Decimal(str(left)).quantize(Decimal("0.01"))
    right_decimal = Decimal(str(right)).quantize(Decimal("0.01"))
    assert left_decimal == right_decimal


def extract_collection_payload(response) -> list[dict[str, Any]]:
    """Normalize list responses across paginated and non-paginated shapes."""
    data = response.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return list(data)
