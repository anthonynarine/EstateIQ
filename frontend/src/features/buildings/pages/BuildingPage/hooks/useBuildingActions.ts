// # Filename: src/features/buildings/pages/BuildingPage/hooks/useBuildingActions.ts


import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { useUpdateBuildingMutation } from "./useUpdateBuildingMutation";
import { useDeleteBuildingMutation } from "./useDeleteBuildingMutation";
import type { Building } from "../../../api/buildingsApi";
import type { BuildingEditValue } from "../forms/BuildingEditModal";
import type { UpdateBuildingInput } from "../../../api/buildingsApi";

type EditModalProps = {
  isOpen: boolean;
  buildingDisplayName: string;
  value: BuildingEditValue;
  onChange: (next: Partial<BuildingEditValue>) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
};

type DeleteModalProps = {
  isOpen: boolean;
  buildingDisplayName: string;
  errorMessage?: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function extractApiDetail(err: unknown): string | null {
  // Step 1: Pull DRF-style { detail: "..." } if present
  if (!axios.isAxiosError(err)) return null;

  const data = err.response?.data as unknown;
  if (!data || typeof data !== "object") return null;

  const maybe = data as Record<string, unknown>;
  if (typeof maybe.detail === "string" && maybe.detail.trim()) {
    return maybe.detail;
  }

  return null;
}

function displayName(building: Building): string {
  // Step 1: Prefer name
  if (building.name?.trim()) return building.name.trim();
  return `#${building.id}`;
}

function toEditValue(building: Building): BuildingEditValue {
  // Step 1: Convert API model into string-based edit value
  return {
    name: building.name ?? "",
    building_type: building.building_type ?? "",
    country: building.country ?? "US",
    address_line1: building.address_line1 ?? "",
    address_line2: building.address_line2 ?? "",
    city: building.city ?? "",
    state: building.state ?? "",
    postal_code: building.postal_code ?? "",
  };
}

function toUpdatePayload(value: BuildingEditValue): UpdateBuildingInput {
  // Step 1: Trim + normalize for API payload
  return {
    name: value.name.trim(),
    building_type: value.building_type.trim() || "other",
    country: value.country.trim() || "US",
    address_line1: value.address_line1.trim(),
    address_line2: value.address_line2.trim() || null,
    city: value.city.trim(),
    state: value.state.trim(),
    postal_code: value.postal_code.trim(),
  };
}

/**
 * useBuildingActions
 *
 * Page-level orchestration hook for Building edit/delete actions.
 *
 * Responsibilities:
 * - Own edit modal open/value state (string-based)
 * - Own delete confirm open/error state
 * - Call update/delete mutations
 * - Map backend errors to UI message (detail)
 * - Provide "modal props" for presentational modals
 */
export default function useBuildingActions(orgSlug: string) {
  // Step 1: Mutations
  const updateMutation = useUpdateBuildingMutation(orgSlug);
  const deleteMutation = useDeleteBuildingMutation(orgSlug);

  // Step 2: Local state
  const [editBuilding, setEditBuilding] = useState<Building | null>(null);
  const [editValue, setEditValue] = useState<BuildingEditValue>({
    name: "",
    building_type: "",
    country: "US",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const [deleteBuilding, setDeleteBuilding] = useState<Building | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Step 3: Edit actions
  const openEdit = useCallback((building: Building) => {
    setEditBuilding(building);
    setEditValue(toEditValue(building));
    updateMutation.reset();
  }, [updateMutation]);

  const closeEdit = useCallback(() => {
    setEditBuilding(null);
    updateMutation.reset();
  }, [updateMutation]);

  const onEditChange = useCallback((next: Partial<BuildingEditValue>) => {
    setEditValue((prev) => ({ ...prev, ...next }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editBuilding) return;

    const payload = toUpdatePayload(editValue);

    try {
      await updateMutation.mutateAsync({
        buildingId: editBuilding.id,
        payload,
      });
      closeEdit();
    } catch {
      // errors surfaced via editModalProps.errorMessage
    }
  }, [closeEdit, editBuilding, editValue, updateMutation]);

  // Step 4: Delete actions
  const openDelete = useCallback((building: Building) => {
    setDeleteError(null);
    deleteMutation.reset();
    setDeleteBuilding(building);
  }, [deleteMutation]);

  const closeDelete = useCallback(() => {
    setDeleteBuilding(null);
    setDeleteError(null);
    deleteMutation.reset();
  }, [deleteMutation]);

  const confirmDelete = useCallback(async () => {
    if (!deleteBuilding) return;

    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(deleteBuilding.id);
      closeDelete();
    } catch (err) {
      const msg =
        extractApiDetail(err) ?? "Delete failed. Please try again.";
      setDeleteError(msg);
    }
  }, [closeDelete, deleteBuilding, deleteMutation]);

  // Step 5: Modal props
  const editModalProps: EditModalProps = useMemo(
    () => ({
      isOpen: !!editBuilding,
      buildingDisplayName: editBuilding ? displayName(editBuilding) : "",
      value: editValue,
      onChange: onEditChange,
      onClose: closeEdit,
      onSubmit: submitEdit,
      isSaving: updateMutation.isPending,
      errorMessage: updateMutation.isError
        ? extractApiDetail(updateMutation.error) ??
          "Update failed. Please check fields and try again."
        : null,
    }),
    [
      closeEdit,
      editBuilding,
      editValue,
      onEditChange,
      submitEdit,
      updateMutation.error,
      updateMutation.isError,
      updateMutation.isPending,
    ]
  );

  const deleteModalProps: DeleteModalProps = useMemo(
    () => ({
      isOpen: !!deleteBuilding,
      buildingDisplayName: deleteBuilding ? displayName(deleteBuilding) : "",
      errorMessage: deleteError,
      isDeleting: deleteMutation.isPending,
      onClose: closeDelete,
      onConfirm: confirmDelete,
    }),
    [
      closeDelete,
      confirmDelete,
      deleteBuilding,
      deleteError,
      deleteMutation.isPending,
    ]
  );

  return {
    openEdit,
    openDelete,
    editModalProps,
    deleteModalProps,
  };
}