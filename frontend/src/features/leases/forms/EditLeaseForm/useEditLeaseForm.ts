// # Filename: src/features/leases/forms/EditLeaseForm/useEditLeaseForm.ts

import { useMemo, useReducer } from "react";
import type { Lease, UpdateLeaseInput } from "../../api/types";
import {
  getPrimaryTenantId,
  isSamePrimaryTenant,
  requiresPrimaryTenantRepair,
} from "../../utils/leaseParty";
import type { TenantMode } from "../TenantSection/tenantTypes";
import {
  createInitialEditLeaseFormState,
  editLeaseFormReducer,
} from "./reducer";
import type {
  EditLeaseFormResetContext,
  EditLeaseValidateResult,
  UseEditLeaseFormReturn,
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
 * useEditLeaseForm
 *
 * Reducer-backed form state + validation + terms patch builder
 * for the lease update workflow.
 *
 * Responsibilities:
 * - manage lease term inputs
 * - manage tenant repair/change workflow state
 * - validate the edit form against backend-safe rules
 * - build terms-only patch fragments
 */
export function useEditLeaseForm(lease: Lease): UseEditLeaseFormReturn {
  const resetContext = useMemo<EditLeaseFormResetContext>(() => {
    // Step 1: Build reset context from the current lease
    return { lease };
  }, [lease]);

  const [state, dispatch] = useReducer(
    editLeaseFormReducer,
    resetContext,
    createInitialEditLeaseFormState
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
    localError,
  } = state;

  const initialPrimaryTenantId = useMemo(() => {
    // Step 1: Resolve authoritative initial primary tenant id
    return getPrimaryTenantId(lease);
  }, [lease]);

  const needsTenantRepair = useMemo(() => {
    // Step 1: Resolve repair state from parties_detail
    return requiresPrimaryTenantRepair(lease);
  }, [lease]);

  const hasTenantChanged = useMemo(() => {
    // Step 1: Treat missing initial tenant as changed when a valid replacement exists
    if (!isValidPositiveInt(initialPrimaryTenantId)) {
      return isValidPositiveInt(primaryTenantId);
    }

    // Step 2: Compare selected tenant id against the authoritative primary tenant
    return !isSamePrimaryTenant(lease, primaryTenantId);
  }, [initialPrimaryTenantId, lease, primaryTenantId]);

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
    // Step 1: Update status
    dispatch({ type: "SET_STATUS", payload: value });
  };

  const setPrimaryTenantId = (value: number | null) => {
    // Step 1: Update selected primary tenant id
    dispatch({ type: "SET_PRIMARY_TENANT_ID", payload: value });
  };

  const setTenantMode = (value: TenantMode) => {
    // Step 1: Update tenant mode
    dispatch({ type: "SET_TENANT_MODE", payload: value });
  };

  const setTenantCreateDraft = (value: typeof tenantCreateDraft) => {
    // Step 1: Update tenant create draft
    dispatch({ type: "SET_TENANT_CREATE_DRAFT", payload: value });
  };

  const setLocalError = (value: string | null) => {
    // Step 1: Update local error
    dispatch({ type: "SET_LOCAL_ERROR", payload: value });
  };

  const enterCreateTenantMode = () => {
    // Step 1: Enter create mode and clear selected tenant
    dispatch({ type: "ENTER_CREATE_TENANT_MODE" });
  };

  const selectExistingTenant = (tenantId: number | null) => {
    // Step 1: Enter select mode and set chosen tenant
    dispatch({ type: "SELECT_EXISTING_TENANT", payload: tenantId });
  };

  const onTenantModeChange = (mode: TenantMode) => {
    // Step 1: Route create mode transition
    if (mode === "create") {
      dispatch({ type: "ENTER_CREATE_TENANT_MODE" });
      return;
    }

    // Step 2: Route select mode transition
    dispatch({ type: "ENTER_SELECT_TENANT_MODE" });
  };

  const reset = () => {
    // Step 1: Reset form from current lease baseline
    dispatch({ type: "RESET_FORM", payload: resetContext });
  };

  const validate = (): EditLeaseValidateResult => {
    // Step 1: Clear any previous local error
    dispatch({ type: "SET_LOCAL_ERROR", payload: null });

    // Step 2: Validate required start date
    if (!startDate.trim()) {
      const message = "Start date is required.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 3: Validate required rent amount
    if (!rentAmount.trim()) {
      const message = "Rent amount is required.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    const rent = Number(rentAmount);

    if (!Number.isFinite(rent) || rent <= 0) {
      const message = "Rent amount must be a valid number greater than zero.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 4: Validate due day range
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

    // Step 5: Validate date ordering
    if (endDate.trim() && endDate.trim() < startDate.trim()) {
      const message = "End date cannot be earlier than start date.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 6: Validate ended status
    if (status === "ended" && !endDate.trim()) {
      const message = "An ended lease must include an end date.";
      dispatch({ type: "SET_LOCAL_ERROR", payload: message });
      return { ok: false, message };
    }

    // Step 7: Validate tenant workflow
    if (tenantMode === "select") {
      if (needsTenantRepair && !isValidPositiveInt(primaryTenantId)) {
        const message =
          "This lease is missing a primary tenant. Select a tenant before saving.";
        dispatch({ type: "SET_LOCAL_ERROR", payload: message });
        return { ok: false, message };
      }

      if (hasTenantChanged && !isValidPositiveInt(primaryTenantId)) {
        const message =
          "A valid primary tenant must be selected before updating this lease.";
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

  const buildTermsPatch = (): UpdateLeaseInput => {
    // Step 1: Normalize due day
    const normalizedDueDay = Number(rentDueDay);

    // Step 2: Build canonical terms-only patch
    return {
      start_date: startDate.trim(),
      end_date: endDate.trim() ? endDate.trim() : null,
      rent_amount: rentAmount.trim(),
      security_deposit_amount: securityDeposit.trim()
        ? securityDeposit.trim()
        : null,
      rent_due_day: normalizedDueDay,
      status,
    };
  };

  return {
    startDate,
    endDate,
    rentAmount,
    rentDueDay,
    securityDeposit,
    status,
    primaryTenantId,
    tenantMode,
    tenantCreateDraft,
    localError,

    initialPrimaryTenantId,
    requiresTenantRepair: needsTenantRepair,
    hasTenantChanged,

    setStartDate,
    setEndDate,
    setRentAmount,
    setRentDueDay,
    setSecurityDeposit,
    setStatus,
    setPrimaryTenantId,
    setTenantMode,
    setTenantCreateDraft,
    setLocalError,

    enterCreateTenantMode,
    selectExistingTenant,
    onTenantModeChange,
    reset,
    validate,
    buildTermsPatch,
  };
}