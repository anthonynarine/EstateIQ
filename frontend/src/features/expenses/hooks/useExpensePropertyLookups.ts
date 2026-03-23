// # Filename: src/features/expenses/hooks/useExpensePropertyLookups.ts


import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  listBuildings,
  type Building,
} from "../../buildings/api/buildingsApi";
import {
  listUnitsByBuilding,
  type Unit,
} from "../../buildings/api/unitsApi";
import type {
  ExpenseBuildingOption,
  ExpenseScope,
  ExpenseUnitOption,
} from "../api/expensesTypes";

type UseExpensePropertyLookupsArgs = {
  scope?: ExpenseScope;
  buildingId?: number | null;
};

type UseExpensePropertyLookupsResult = {
  orgSlug: string | null;
  buildingOptions: ExpenseBuildingOption[];
  unitOptions: ExpenseUnitOption[];
  isLoadingBuildings: boolean;
  isLoadingUnits: boolean;
  propertyLookupError: string | null;
};

/**
 * Converts a Building read model into an expenses form option.
 *
 * @param building Building API record.
 * @returns Expense-friendly building option.
 */
function mapBuildingToOption(building: Building): ExpenseBuildingOption {
  return {
    id: building.id,
    name: building.name,
  };
}

/**
 * Converts a Unit read model into an expenses form option.
 *
 * @param unit Unit API record.
 * @returns Expense-friendly unit option.
 */
function mapUnitToOption(unit: Unit): ExpenseUnitOption {
  return {
    id: unit.id,
    name: unit.label,
    unit_number: unit.label,
    building_id: unit.building,
  };
}

/**
 * Reads the active organization slug from the current URL.
 *
 * Current app pattern:
 * - org context is URL-driven (`?org=<slug>`)
 * - axios interceptors may also attach the org header, but this hook keeps
 *   the dependency explicit for property lookups.
 *
 * @returns Active org slug or null.
 */
function useActiveOrgSlug(): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get("org");
}

/**
 * Loads building + unit lookup options for the scoped expense form.
 *
 * Behavior:
 * - buildings load once org slug is available
 * - units only load when scope is "unit" and a building is selected
 *
 * @param args Current form scope + selected building context.
 * @returns Property lookup state for the expense form.
 */
export function useExpensePropertyLookups({
  scope,
  buildingId,
}: UseExpensePropertyLookupsArgs): UseExpensePropertyLookupsResult {
  const orgSlug = useActiveOrgSlug();
  const shouldLoadUnits = scope === "unit" && Boolean(orgSlug) && Boolean(buildingId);

  const buildingsQuery = useQuery({
    queryKey: ["org", orgSlug, "expense-form", "buildings"],
    queryFn: async () => {
      if (!orgSlug) {
        return [];
      }

      const response = await listBuildings({
        orgSlug,
        page: 1,
        pageSize: 250,
        ordering: "name",
      });

      return response.results;
    },
    enabled: Boolean(orgSlug),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const unitsQuery = useQuery({
    queryKey: ["org", orgSlug, "expense-form", "units", buildingId],
    queryFn: async () => {
      if (!orgSlug || !buildingId) {
        return [];
      }

      const response = await listUnitsByBuilding({
        orgSlug,
        buildingId,
        page: 1,
        pageSize: 250,
        ordering: "label",
      });

      return response.results;
    },
    enabled: shouldLoadUnits,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const buildingOptions = useMemo<ExpenseBuildingOption[]>(() => {
    return (buildingsQuery.data ?? []).map(mapBuildingToOption);
  }, [buildingsQuery.data]);

  const unitOptions = useMemo<ExpenseUnitOption[]>(() => {
    return (unitsQuery.data ?? []).map(mapUnitToOption);
  }, [unitsQuery.data]);

  const propertyLookupError = useMemo(() => {
    const firstError = buildingsQuery.error ?? unitsQuery.error;

    if (!firstError) {
      return null;
    }

    return "Unable to load building or unit options for the expense form.";
  }, [buildingsQuery.error, unitsQuery.error]);

  return {
    orgSlug,
    buildingOptions,
    unitOptions,
    isLoadingBuildings: buildingsQuery.isLoading,
    isLoadingUnits: unitsQuery.isLoading,
    propertyLookupError,
  };
}