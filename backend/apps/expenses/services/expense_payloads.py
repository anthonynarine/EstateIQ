# Filename: apps/expenses/services/expense_payloads.py


from dataclasses import dataclass
from typing import Any

from apps.expenses.choices import (
    ExpenseSource,
    ExpenseStatus,
    ReimbursementStatus,
)


@dataclass(frozen=True)
class ExpenseWritePayload:
    """Normalized payload for create/update expense workflows."""

    organization: Any
    scope: str
    title: str
    amount: Any
    expense_date: Any
    building: Any | None = None
    unit: Any | None = None
    lease: Any | None = None
    category: Any | None = None
    vendor: Any | None = None
    description: str = ""
    due_date: Any | None = None
    paid_date: Any | None = None
    status: str = ExpenseStatus.DRAFT
    is_reimbursable: bool = False
    reimbursement_status: str = ReimbursementStatus.NOT_APPLICABLE
    invoice_number: str = ""
    external_reference: str = ""
    notes: str = ""
    source: str = ExpenseSource.MANUAL
    created_by: Any | None = None
    updated_by: Any | None = None