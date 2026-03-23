from django.contrib import admin

# Register your models here.
# Step 1: Import Django admin.
from django.contrib import admin

# Step 2: Import expense models.
from apps.expenses.models import Expense, ExpenseCategory, Vendor


# Step 3: Register category model.
@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    """Admin config for expense categories."""

    list_display = ("name", "organization", "is_active", "created_at")


# Step 4: Register vendor model.
@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    """Admin config for vendors."""

    list_display = ("name", "organization", "is_active", "created_at")


# Step 5: Register expense model.
@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    """Admin config for expenses."""

    list_display = (
        "description",
        "organization",
        "amount",
        "expense_date",
        "category",
        "vendor",
        "status",
    )