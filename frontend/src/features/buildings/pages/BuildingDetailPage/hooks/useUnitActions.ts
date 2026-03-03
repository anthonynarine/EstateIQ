// # Filename: src/features/buildings/pages/BuildingDetailPage/hooks/useUnitActions.ts


import { useCallback, useMemo, useState } from "react";
import axios from "axios";

import { useUpdateUnitMutation } from "../../../queries/useUpdateUnitMutation";
import { useDeleteUnitMutation } from "../../../queries/useDeleteMutation";
import type { UpdateUnitInput } from "../../../api/unitsApi";

export type UnitForUi = {
  id: number;
  label: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
};

export type UnitEditFormValue = {
  label: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
};

type EditModalProps = {
  isOpen: boolean;
  unitDisplayName: string;
  value: UnitEditFormValue;
  onChange: (next: Partial<UnitEditFormValue>) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
};

type DeleteModalProps = {
  isOpen: boolean;
  unitDisplayName: string;
  errorMessage?: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function extractApiDetail(err: unknown): string | null {
  // Step 1: Axios-only extraction
  if (!axios.isAxiosError(err)) return null;

  const data = err.response?.data as unknown;
  if (!data || typeof data !== "object") return null;

  const maybe = data as Record<string, unknown>;
  if (typeof maybe.detail === "string" && maybe.detail.trim()) return maybe.detail;

  return null;
}

function unitDisplayName(unit: UnitForUi): string {
  // Step 1: Prefer label if present
  const label = unit.label?.trim();
  if (label) return label;

  // Step 2: Fallback to stable identifier
  return `#${unit.id}`;
}

function parseNullableNumber(value: string): number | null {
  // Step 1: empty => null
  if (!value.trim()) return null;

  // Step 2: convert
  const n = Number(value);

  // Step 3: invalid => null
  if (!Number.isFinite(n)) return null;

  return n;
}

/**
 * useUnitActions
 *
 * Single-responsibility orchestration hook for unit edit + delete actions.
 *
 * What it does:
 * - owns modal open/close state
 * - owns string-based edit form state (UI-friendly)
 * - calls mutations (update/delete) and maps server errors to user-friendly messages
 * - returns "modal props" objects for presentational-only modals
 *
 * What it does NOT do:
 * - render UI
 * - fetch units/building (the page orchestrator owns queries)
 */
export function useUnitActions(buildingId: number) {
  // Step 1: Mutations
  const updateUnitMutation = useUpdateUnitMutation(buildingId);
  const deleteUnitMutation = useDeleteUnitMutation(buildingId);

  // Step 2: Local state
  const [editUnit, setEditUnit] = useState<UnitForUi | null>(null);
  const [editValue, setEditValue] = useState<UnitEditFormValue>({
    label: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
  });

  const [deleteUnit, setDeleteUnit] = useState<UnitForUi | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Step 3: Actions
  const openEdit = useCallback((unit: UnitForUi) => {
    setEditUnit(unit);

    setEditValue({
      label: unit.label ?? "",
      bedrooms: unit.bedrooms === null ? "" : String(unit.bedrooms),
      bathrooms: unit.bathrooms === null ? "" : String(unit.bathrooms),
      sqft: unit.sqft === null ? "" : String(unit.sqft),
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditUnit(null);
    updateUnitMutation.reset();
  }, [updateUnitMutation]);

  const onEditChange = useCallback((next: Partial<UnitEditFormValue>) => {
    setEditValue((prev) => ({ ...prev, ...next }));
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editUnit) return;

    // Step 1: Build patch payload (defense: no building here)
    const payload: UpdateUnitInput = {
      label: editValue.label.trim() ? editValue.label.trim() : "",
      bedrooms: parseNullableNumber(editValue.bedrooms),
      bathrooms: parseNullableNumber(editValue.bathrooms),
      square_feet: parseNullableNumber(editValue.sqft),
    };

    // Step 2: Mutate
    await updateUnitMutation.mutateAsync({
      unitId: editUnit.id,
      payload,
    });

    // Step 3: Close modal on success
    closeEdit();
  }, [closeEdit, editUnit, editValue, updateUnitMutation]);

  const openDelete = useCallback(
    (unit: UnitForUi) => {
      setDeleteError(null);
      deleteUnitMutation.reset();
      setDeleteUnit(unit);
    },
    [deleteUnitMutation]
  );

  const closeDelete = useCallback(() => {
    setDeleteUnit(null);
    setDeleteError(null);
    deleteUnitMutation.reset();
  }, [deleteUnitMutation]);

  const confirmDelete = useCallback(async () => {
    if (!deleteUnit) return;

    setDeleteError(null);

    try {
      await deleteUnitMutation.mutateAsync(deleteUnit.id);
      closeDelete();
    } catch (err) {
      // Step 1: Prefer API detail (409 integrity blocks, etc.)
      const msg = extractApiDetail(err) ?? "Delete failed. Please try again.";
      setDeleteError(msg);
    }
  }, [closeDelete, deleteUnit, deleteUnitMutation]);

  // Step 4: Modal props (stable, presentational-friendly)
  const editModalProps: EditModalProps = useMemo(
    () => ({
      isOpen: !!editUnit,
      unitDisplayName: editUnit ? unitDisplayName(editUnit) : "",
      value: editValue,
      onChange: onEditChange,
      onClose: closeEdit,
      onSubmit: submitEdit,
      isSaving: updateUnitMutation.isPending,
      errorMessage: updateUnitMutation.isError
        ? "Update failed. Please check fields and try again."
        : null,
    }),
    [
      closeEdit,
      editUnit,
      editValue,
      onEditChange,
      submitEdit,
      updateUnitMutation.isError,
      updateUnitMutation.isPending,
    ]
  );

  const deleteModalProps: DeleteModalProps = useMemo(
    () => ({
      isOpen: !!deleteUnit,
      unitDisplayName: deleteUnit ? unitDisplayName(deleteUnit) : "",
      errorMessage: deleteError,
      isDeleting: deleteUnitMutation.isPending,
      onClose: closeDelete,
      onConfirm: confirmDelete,
    }),
    [closeDelete, confirmDelete, deleteError, deleteUnit, deleteUnitMutation.isPending]
  );

  return {
    // Step 5: Handlers to wire into UnitCard
    openEdit,
    openDelete,

    // Step 6: Drop-in props for presentational modals
    editModalProps,
    deleteModalProps,
  };
}

export default useUnitActions;