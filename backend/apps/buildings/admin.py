# Filename: apps/buildings/admin.py

from __future__ import annotations

from django.contrib import admin

from apps.buildings.models import Building, Unit


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "building_type", "organization", "created_at")
    list_filter = ("building_type", "organization")
    search_fields = ("name", "address_line1", "city", "state", "postal_code")
    ordering = ("-created_at",)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "building", "organization", "bedrooms", "bathrooms", "sqft")
    list_filter = ("organization", "building")
    search_fields = ("label", "building__name")
    ordering = ("-created_at",)
