// # Filename: src/features/leases/forms/CreateLeaseForm/useCreateLeaseForm.ts

import { useMemo, useReducer } from "react";
import type { CreateLeaseInput } from "../../api/types";
import type { TenantMode } from "../TenantSection/tenantTypes";
import {
  createInitialCreateLeaseFormState,
  createLeaseFormReducer,
} from "./reducer";
import type {
  BuildExistingTenantPayloadResult,
  BuildNewTenantLeasePayloadResult,
  BuildPayloadArgs,
  CreateLeaseFormResetContext,
  CreateLeaseParty,
  ResolveUnitArgs,
  UseCreateLeaseFormArgs,
  UseCreateLeaseFormReturn,
  ValidateArgs,
  ValidateResult,
} from "./types";

/**
 * isValidPositiveInt
 *
 * Checks whether a value is a finite positive integer.
 *
 * @param value Candidate number
 * @returns True when value is a positive integer
 */
function isValidPositiveInt(value: number | null | undefined): value is number {
  // Step 1: Return true only for positive integers
  return Number.isInteger(value) && Number(value) > 0;
}

/**
 * resolveEffectiveUnitId
 *
 * Resolves the effective unit id for submit-time validation and payload build.
 *
 * Priority:
 * 1. Route-prefilled unit id
 * 2. Manually selected unit id
 *
 * @param args.unitId Route-prefilled unit id
 * @param selectedUnitId Locally selected unit id
 * @returns Effective unit id or null
 */
function resolveEffectiveUnitId(
  { unitId }: ResolveUnitArgs,
  selectedUnitId: number | null
): number | null {
  // Step 1: Prefer route-prefilled unit context
  if (isValidPositiveInt(unitId)) {
    return unitId;
  }

  // Step 2: Fall back to manual unit selection
  if (isValidPositiveInt(selectedUnitId)) {
    return selectedUnitId;
  }

  // Step 3: Return null when neither source is valid
  return null;
}

/**
 * useCreateLeaseForm
 *
 * Form state + validation + payload builders for the lease creation workflow.
 *
 * Supports:
 * - existing tenant selection
 * - new tenant draft workflow
 * - prefilled tenant/building/unit launch context
 * - backend-safe payload generation for both submit paths
 */
export function useCreateLeaseForm({
  initialTenantId = null,
  initialBuildingId = null,
  initialUnitId = null,
}: UseCreateLeaseFormArgs = {}): UseCreateLeaseFormReturn {
  const normalizedInitialTenantId = useMemo(() => {
    // Step 1: Normalize initial tenant id
    return isValidPositiveInt(initialTenantId) ? initialTenantId : null;
  }, [initialTenantId]);

  const normalizedInitialBuildingId = useMemo(() => {
    // Step 1: Normalize initial building id
    return isValidPositiveInt(initialBuildingId) ? initialBuildingId : null;
  }, [initialBuildingId]);

  const normalizedInitialUnitId = useMemo(() => {
    // Step 1: Normalize initial unit id
    return isValidPositiveInt(initialUnitId) ? initialUnitId : null;
  }, [initialUnitId]);

  const resetContext = useMemo<CreateLeaseFormResetContext>(() => {
    // Step 1: Build normalized reset context
    return {
      initialTenantId: normalizedInitialTenantId,
      initialBuildingId: normalizedInitialBuildingId,
      initialUnitId: normalizedInitialUnitId,
    };
  }, [
    normalizedInitialTenantId,
    normalizedInitialBuildingId,
    normalizedInitialUnitId,
  ]);

  const [state, dispatch] = useReducer(
    createLeaseFormReducer,
    resetContext,
    createInitialCreateLeaseFormState
  );

  const {
    startDate,
    endDate,
    rentAmount,
    rentDueDay,
    securityDeposit,
    status,
    primaryTenantId,
    tenantMode,
    tenantCreateDraft,
    selectedBuildingId,
    selectedUnitId,
    localError,
  } = state;

  const setStartDate = (value: string) => {
    // Step 1: Update start date
    dispatch({ type: "SET_START_DATE", payload: value });
  };

  const setEndDate = (value: string) => {
    // Step 1: Update end date
    dispatch({ type: "SET_END_DATE", payload: value });
  };

  const setRentAmount = (value: string) => {
    // Step 1: Update rent amount
    dispatch({ type: "SET_RENT_AMOUNT", payload: value });
  };

  const setRentDueDay = (value: string) => {
    // Step 1: Update rent due day
    dispatch({ type: "SET_RENT_DUE_DAY", payload: value });
  };

  const setSecurityDeposit = (value: string) => {
    // Step 1: Update security deposit
    dispatch({ type: "SET_SECURITY_DEPOSIT", payload: value });
  };

  const setStatus = (value: typeof status) => {
    // Step 1: Update lease status
    dispatch({ type: "SET_STATUS", payload: value });
  };

  const setPrimaryTenantId = (value: number | null) => {
    // Step 1: Update primary tenant id
    dispatch({ type: "SET_PRIMARY_TENANT_ID", payload: value });
  };

  const setTenantMode = (value: TenantMode) => {
    // Step 1: Update tenant mode
    dispatch({ type: "SET_TENANT_MODE", payload: value });
  };

  const setTenantCreateDraft = (value: typeof tenantCreateDraft) => {
    // Step 1: Update tenant draft
    dispatch({ type: "SET_TENANT_CREATE_DRAFT", payload: value });
  };

  const setSelectedBuildingId = (value: number | null) => {
    // Step 1: Update selected building id
    dispatch({ type: "SET_SELECTED_BUILDING_ID", payload: value });
  };

  const setSelectedUnitId = (value: number | null) => {
    // Step 1: Update selected unit id
    dispatch({ type: "SET_SELECTED_UNIT_ID", payload: value });
  };

  const setLocalError = (value: string | null) => {
    // Step 1: Update local error state
    dispatch({ type: "SET_LOCAL_ERROR", payload: value });
  };

  /**
   * enterCreateTenantMode
   *
   * Switches the UI into create mode and clears selected tenant state.
   */
  const enterCreateTenantMode = () => {
    // Step 1: Enter create mode via reducer
    dispatch({ type: "ENTER_CREATE_TENANT_MODE" });
  };

  /**
   * selectExistingTenant
   *
   * Switches the UI into select mode and sets the primary tenant id.
   *
   * @param tenantId Selected tenant id
   */
  const selectExistingTenant = (tenantId: number | null) => {
    // Step 1: Select existing tenant via reducer
    dispatch({ type: "SELECT_EXISTING_TENANT", payload: tenantId });
  };

  /**
   * onTenantModeChange
   *
   * Safe mode switcher for tenant mode UI.
   *
   * @param mode Next mode
   */
  const onTenantModeChange = (mode: TenantMode) => {
    // Step 1: Route create mode transition
    if (mode === "create") {
      dispatch({ type: "ENTER_CREATE_TENANT_MODE" });
      return;
    }

    // Step 2: Route select mode transition
    dispatch({ type: "ENTER_SELECT_TENANT_MODE" });
  };

  /**
   * onBuildingChange
   *
   * Updates selected building and clears dependent unit selection.
   *
   * @param buildingId Selected building id
   */
  const onBuildingChange = (buildingId: number | null) => {
    // Step 1: Change building and clear selected unit
    dispatch({ type: "CHANGE_BUILDING", payload: buildingId });
  };

  /**
   * onUnitChange
   *
   * Updates selected unit.
   *
   * @param unitId Selected unit id
   */
  const onUnitChange = (unitId: number | null) => {
    // Step 1: Change selected unit
    dispatch({ type: "CHANGE_UNIT", payload: unitId });
  };

  /**
   * reset
   *
   * Resets the form while preserving launch context.
   */
  const reset = () => {
    // Step 1: Reset full form state from launch context
    dispatch({ type: "RESET_FORM", payload: resetContext });
  };

  /**
   * validate
   *
   * Validates current form state before submit.
   *
   * @param args.unitId Route-prefilled unit id
   * @returns Validation result
   */
  const validate = ({ unitId }: ValidateArgs): ValidateResult => {
    // Step 1: Clear any previous error
    dispatch({ type: "SET_LOCAL_ERROR", payload: null });

    // Step 2: Resolve effective unit id
    const effectiveUnitId = resolveEffectiveUnitId({ unitId }, selectedUnitId);

    // Step 3: Validate unit selection
    if (!isValidPositiveInt(effectiveUnitId)) {
      const message = "A valid unit must be selected before creating a lease.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 4: Validate required start date
    if (!startDate.trim()) {
      const message = "Start date is required.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 5: Validate required rent amount
    if (!rentAmount.trim()) {
      const message = "Rent amount is required.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 6: Validate due day range
    const dueDay = Number(rentDueDay);

    if (!Number.isFinite(dueDay)) {
      const message = "Rent due day must be a valid number between 1 and 28.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    if (dueDay < 1 || dueDay > 28) {
      const message = "Rent due day must be between 1 and 28.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 7: Validate optional end date ordering
    if (endDate.trim() && endDate.trim() < startDate.trim()) {
      const message = "End date cannot be earlier than start date.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 8: Validate tenant workflow by mode
    if (tenantMode === "select") {
      if (!isValidPositiveInt(primaryTenantId)) {
        const message =
          "A primary tenant must be selected before creating a lease.";
        dispatch({ type: "SET_LOCAL_ERROR", payload: message });
        return { ok: false, message };
      }
    }

    if (tenantMode === "create") {
      if (!tenantCreateDraft.full_name.trim()) {
        const message = "Tenant name is required.";
        dispatch({ type: "SET_LOCAL_ERROR", payload: message });
        return { ok: false, message };
      }
    }

    return { ok: true };
  };

  /**
   * buildExistingTenantPayload
   *
   * Builds the backend-safe lease payload for the existing-tenant workflow.
   *
   * Important:
   * - Includes the required primary tenant relationship in `parties`.
   *
   * @param args.unitId Route-prefilled unit id
   * @returns Canonical create payload
   */
  const buildExistingTenantPayload = ({
    unitId,
  }: BuildPayloadArgs): BuildExistingTenantPayloadResult => {
    // Step 1: Resolve effective unit id
    const effectiveUnitId = resolveEffectiveUnitId({ unitId }, selectedUnitId);

    // Step 2: Guard required unit id
    if (!isValidPositiveInt(effectiveUnitId)) {
      throw new Error("Cannot build lease payload without a valid unit id.");
    }

    // Step 3: Guard required primary tenant id
    if (!isValidPositiveInt(primaryTenantId)) {
      throw new Error(
        "Cannot build lease payload without a valid primary tenant id."
      );
    }

    // Step 4: Normalize optional fields
    const normalizedEndDate = endDate.trim() ? endDate.trim() : null;
    const normalizedDeposit = securityDeposit.trim()
      ? securityDeposit.trim()
      : null;

    // Step 5: Normalize required fields
    const normalizedRent = rentAmount.trim();
    const normalizedDueDay = Number(rentDueDay);

    // Step 6: Build required primary tenant party payload
    const parties: CreateLeaseParty[] = [
      {
        tenant_id: primaryTenantId,
        role: "primary",
      },
    ];

    // Step 7: Build canonical payload
    const payload: CreateLeaseInput = {
      unit: effectiveUnitId,
      start_date: startDate.trim(),
      end_date: normalizedEndDate,
      rent_amount: normalizedRent,
      security_deposit_amount: normalizedDeposit,
      rent_due_day: normalizedDueDay,
      status,
      parties,
    };

    return { payload };
  };

  /**
   * buildNewTenantLeasePayload
   *
   * Builds the backend-safe lease payload for the new-tenant workflow.
   *
   * Important:
   * - Does NOT include `parties`
   * - The submit mutation will inject the newly created tenant as primary
   *
   * @param args.unitId Route-prefilled unit id
   * @returns Lease payload without parties
   */
  const buildNewTenantLeasePayload = ({
    unitId,
  }: BuildPayloadArgs): BuildNewTenantLeasePayloadResult => {
    // Step 1: Resolve effective unit id
    const effectiveUnitId = resolveEffectiveUnitId({ unitId }, selectedUnitId);

    // Step 2: Guard required unit id
    if (!isValidPositiveInt(effectiveUnitId)) {
      throw new Error("Cannot build lease payload without a valid unit id.");
    }

    // Step 3: Normalize optional fields
    const normalizedEndDate = endDate.trim() ? endDate.trim() : null;
    const normalizedDeposit = securityDeposit.trim()
      ? securityDeposit.trim()
      : null;

    // Step 4: Normalize required fields
    const normalizedRent = rentAmount.trim();
    const normalizedDueDay = Number(rentDueDay);

    // Step 5: Build lease payload without parties
    const payload: Omit<CreateLeaseInput, "parties"> = {
      unit: effectiveUnitId,
      start_date: startDate.trim(),
      end_date: normalizedEndDate,
      rent_amount: normalizedRent,
      security_deposit_amount: normalizedDeposit,
      rent_due_day: normalizedDueDay,
      status,
    };

    return { payload };
  };

  return {
    // Step 1: Lease values
    startDate,
    endDate,
    rentAmount,
    rentDueDay,
    securityDeposit,
    status,

    // Step 2: Tenant values
    primaryTenantId,
    tenantMode,
    tenantCreateDraft,

    // Step 3: Building + unit values
    selectedBuildingId,
    selectedUnitId,

    // Step 4: Error state
    localError,

    // Step 5: Setters
    setStartDate,
    setEndDate,
    setRentAmount,
    setRentDueDay,
    setSecurityDeposit,
    setStatus,
    setPrimaryTenantId,
    setTenantMode,
    setTenantCreateDraft,
    setSelectedBuildingId,
    setSelectedUnitId,
    setLocalError,

    // Step 6: Actions
    enterCreateTenantMode,
    selectExistingTenant,
    onTenantModeChange,
    onBuildingChange,
    onUnitChange,

    // Step 7: Helpers
    reset,
    validate,
    buildExistingTenantPayload,
    buildNewTenantLeasePayload,
  };
}