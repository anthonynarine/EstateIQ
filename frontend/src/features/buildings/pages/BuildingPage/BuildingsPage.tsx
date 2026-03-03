// # Filename: src/features/buildings/pages/BuildingPage/BuildingsPage.tsx
// ✅ New Code

import type React from "react";
import { useMemo, useState } from "react";
import { formatApiError } from "../../../../api/formatApiError";
import { useOrg } from "../../../tenancy/hooks/useOrg";

import { useBuildingsQuery, useCreateBuildingMutation } from "./hooks/useBuildings";
import type { Building, CreateBuildingInput } from "../../api/buildingsApi";
import BuildingHeader from "./components/BuildingHeader";
import BuildingsList from "./components/BuildingsList";
import CreateBuildingForm, { type BuildingFormValue } from "./forms/CreateBuildingForm";

import useBuildingActions from "./hooks/useBuildingActions";
import BuildingEditModal from "./forms/BuildingEditModal";
import BuildingDeleteConfirmModal from "./forms/BuildingDeleteConfirmModal";

type DRFPaginated<T> = {
  results: T[];
};

const PAGE_CONTAINER_CLASS =
  "mx-auto w-full px-4 py-6 max-w-[980px] lg:max-w-[1200px] lg:px-6 2xl:max-w-[1400px]";

const EMPTY_FORM: BuildingFormValue = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
  notes: "",
};

/**
 * validateForm
 *
 * UI-level validation for required fields.
 */
function validateForm(
  v: BuildingFormValue
): Partial<Record<keyof BuildingFormValue, string>> {
  const errors: Partial<Record<keyof BuildingFormValue, string>> = {};

  if (!v.name.trim()) errors.name = "Building name is required.";
  if (!v.address_line1.trim()) errors.address_line1 = "Address line 1 is required.";
  if (!v.city.trim()) errors.city = "City is required.";
  if (!v.state.trim()) errors.state = "State is required.";
  if (!v.postal_code.trim()) errors.postal_code = "Postal code is required.";

  return errors;
}

/**
 * normalizeCreatePayload
 *
 * Converts UI form (strings) into API payload (nullables).
 */
function normalizeCreatePayload(v: BuildingFormValue): CreateBuildingInput {
  return {
    name: v.name.trim(),
    address_line1: v.address_line1.trim(),
    address_line2: v.address_line2.trim() ? v.address_line2.trim() : null,
    city: v.city.trim(),
    state: v.state.trim(),
    postal_code: v.postal_code.trim(),
    country: v.country.trim() ? v.country.trim() : null,
    notes: v.notes.trim() ? v.notes.trim() : null,
  };
}

/**
 * BuildingsPage
 *
 * Orchestrator-only page:
 * - Fetch buildings
 * - Create building (inline form)
 * - Delegate edit/delete to `useBuildingActions`
 */
export default function BuildingsPage() {
  const { orgSlug } = useOrg();
  const hasOrg = Boolean(orgSlug);

  // Step 1: Server state (org-scoped)
  const buildingsQuery = useBuildingsQuery(orgSlug);
  const createMutation = useCreateBuildingMutation(orgSlug);

  // ✅ New Code: page-level building actions (edit/delete)
  const { openEdit, openDelete, editModalProps, deleteModalProps } = useBuildingActions(orgSlug);

  // Step 2: UI state (create only)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<BuildingFormValue>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof BuildingFormValue, string>>
  >({});

  // Step 3: Normalize DRF response shape (array vs {results})
  const buildingsRaw =
    buildingsQuery.data as Building[] | DRFPaginated<Building> | undefined;

  const buildings = useMemo(() => {
    const list: Building[] = Array.isArray(buildingsRaw)
      ? buildingsRaw
      : Array.isArray(buildingsRaw?.results)
        ? buildingsRaw.results
        : [];

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [buildingsRaw]);

  // Step 4: Error formatting
  const listErrorText = buildingsQuery.error ? formatApiError(buildingsQuery.error) : null;
  const createErrorText = createMutation.error ? formatApiError(createMutation.error) : null;

  // Step 5: Field setter (matches CreateBuildingForm contract)
  function updateField<K extends keyof BuildingFormValue>(
    key: K,
    value: BuildingFormValue[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));

    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Step 6: Submit
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = normalizeCreatePayload(form);
    await createMutation.mutateAsync(payload);

    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsCreateOpen(false);
  };

  // Step 7: Org guard
  if (!hasOrg) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h1 className="text-lg font-semibold text-white">Buildings</h1>
          <p className="mt-2 text-sm text-white/70">
            Select an organization first. This page is org-scoped.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <BuildingHeader
        orgSlug={orgSlug}
        isCreateOpen={isCreateOpen}
        onToggleCreate={() => setIsCreateOpen((v) => !v)}
      />

      {isCreateOpen ? (
        <div className="mt-5">
          <CreateBuildingForm
            value={form}
            errors={formErrors}
            onChangeField={updateField}
            onSubmit={handleSubmit}
            onCancel={() => {
              setForm(EMPTY_FORM);
              setFormErrors({});
              setIsCreateOpen(false);
            }}
            isSubmitting={createMutation.isPending}
            errorText={createErrorText}
          />
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {listErrorText ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {listErrorText}
          </div>
        ) : null}

        <BuildingsList
          buildings={buildings}
          isLoading={buildingsQuery.isLoading}
          isFetching={buildingsQuery.isFetching}
          // ✅ New Code
          onEdit={openEdit}
          onDelete={openDelete}
        />
      </div>

      {/* ✅ New Code: modals (pure presentational) */}
      <BuildingEditModal {...editModalProps} />
      <BuildingDeleteConfirmModal {...deleteModalProps} />
    </div>
  );
}