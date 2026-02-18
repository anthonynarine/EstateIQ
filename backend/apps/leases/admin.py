# Filename: backend/apps/leases/admin.py
from django.contrib import admin

from apps.leases.models import Lease, LeaseTenant, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "phone", "organization", "created_at")
    list_filter = ("organization", "created_at")
    search_fields = ("full_name", "email", "phone")
    ordering = ("-created_at",)


class LeaseTenantInline(admin.TabularInline):
    model = LeaseTenant
    extra = 0
    autocomplete_fields = ("tenant",)


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "organization",
        "unit",
        "status",
        "start_date",
        "end_date",
        "rent_amount",
        "rent_due_day",
        "created_at",
    )
    list_filter = ("organization", "status", "created_at")
    search_fields = ("unit__label", "unit__building__name")
    ordering = ("-created_at",)
    inlines = [LeaseTenantInline]


@admin.register(LeaseTenant)
class LeaseTenantAdmin(admin.ModelAdmin):
    list_display = ("id", "organization", "lease", "tenant", "role", "created_at")
    list_filter = ("organization", "role", "created_at")
    search_fields = ("tenant__full_name", "tenant__email")
    ordering = ("-created_at",)
