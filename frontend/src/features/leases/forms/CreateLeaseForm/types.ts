// # Filename: src/features/leases/forms/CreateLeaseForm/types.ts

import type { CreateLeaseInput, LeaseStatus } from "../../api/types";
import type { TenantCreateDraft, TenantMode } from "../TenantSection/tenantTypes";

/**
 * Canonical lease-party payload used by the create lease form.
 *
 * This is intentionally narrow for the current workflow:
 * exactly one primary tenant is required on create.
 */
export type CreateLeaseParty = {
  tenant_id: number;
  role: "primary";
};

/**
 * Props accepted by the create lease form launch context.
 *
 * These values may be prefilled when launching from:
 * - a building page
 * - a unit page
 * - a tenant page
 * - a blank/global create flow
 */
export type UseCreateLeaseFormArgs = {
  initialTenantId?: number | null;
  initialBuildingId?: number | null;
  initialUnitId?: number | null;
};

/**
 * Full internal state for the create lease workflow.
 *
 * This is UI state, not the raw API contract.
 */
export type CreateLeaseFormState = {
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;

  primaryTenantId: number | null;
  tenantMode: TenantMode;
  tenantCreateDraft: TenantCreateDraft;

  selectedBuildingId: number | null;
  selectedUnitId: number | null;

  localError: string | null;
};

/**
 * Data preserved across resets so the form can return
 * to its launch context instead of wiping everything to null.
 */
export type CreateLeaseFormResetContext = {
  initialTenantId: number | null;
  initialBuildingId: number | null;
  initialUnitId: number | null;
};

/**
 * Args for resolving which unit should be used for submit-time logic.
 */
export type ResolveUnitArgs = {
  unitId: number | null;
};

/**
 * Args passed into validation.
 *
 * `unitId` may come from route or launch context.
 */
export type ValidateArgs = {
  unitId: number | null;
};

/**
 * Validation result for form submission.
 */
export type ValidateResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

/**
 * Args passed into payload building.
 */
export type BuildPayloadArgs = {
  unitId: number | null;
};

/**
 * Result returned by the existing-tenant payload builder.
 */
export type BuildExistingTenantPayloadResult = {
  payload: CreateLeaseInput;
};

/**
 * Result returned by the new-tenant payload builder.
 *
 * Important:
 * - `parties` is intentionally omitted because the submit mutation
 *   will inject the newly created tenant as the required primary party.
 */
export type BuildNewTenantLeasePayloadResult = {
  payload: Omit<CreateLeaseInput, "parties">;
};

/**
 * Reducer action union for the create lease form.
 *
 * These actions represent workflow-safe transitions for the full
 * lease creation experience.
 */
export type CreateLeaseFormAction =
  | { type: "SET_START_DATE"; payload: string }
  | { type: "SET_END_DATE"; payload: string }
  | { type: "SET_RENT_AMOUNT"; payload: string }
  | { type: "SET_RENT_DUE_DAY"; payload: string }
  | { type: "SET_SECURITY_DEPOSIT"; payload: string }
  | { type: "SET_STATUS"; payload: LeaseStatus }
  | { type: "SET_PRIMARY_TENANT_ID"; payload: number | null }
  | { type: "SET_TENANT_MODE"; payload: TenantMode }
  | { type: "SET_TENANT_CREATE_DRAFT"; payload: TenantCreateDraft }
  | { type: "SET_SELECTED_BUILDING_ID"; payload: number | null }
  | { type: "SET_SELECTED_UNIT_ID"; payload: number | null }
  | { type: "SET_LOCAL_ERROR"; payload: string | null }
  | { type: "ENTER_CREATE_TENANT_MODE" }
  | { type: "ENTER_SELECT_TENANT_MODE" }
  | { type: "SELECT_EXISTING_TENANT"; payload: number | null }
  | { type: "CHANGE_BUILDING"; payload: number | null }
  | { type: "CHANGE_UNIT"; payload: number | null }
  | { type: "RESET_FORM"; payload: CreateLeaseFormResetContext };

/**
 * Public return shape for the form hook.
 *
 * This keeps component usage explicit and makes future refactors safer.
 */
export type UseCreateLeaseFormReturn = {
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;

  primaryTenantId: number | null;
  tenantMode: TenantMode;
  tenantCreateDraft: TenantCreateDraft;

  selectedBuildingId: number | null;
  selectedUnitId: number | null;

  localError: string | null;

  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setRentAmount: (value: string) => void;
  setRentDueDay: (value: string) => void;
  setSecurityDeposit: (value: string) => void;
  setStatus: (value: LeaseStatus) => void;
  setPrimaryTenantId: (value: number | null) => void;
  setTenantMode: (value: TenantMode) => void;
  setTenantCreateDraft: (value: TenantCreateDraft) => void;
  setSelectedBuildingId: (value: number | null) => void;
  setSelectedUnitId: (value: number | null) => void;
  setLocalError: (value: string | null) => void;

  enterCreateTenantMode: () => void;
  selectExistingTenant: (tenantId: number | null) => void;
  onTenantModeChange: (mode: TenantMode) => void;
  onBuildingChange: (buildingId: number | null) => void;
  onUnitChange: (unitId: number | null) => void;

  reset: () => void;
  validate: (args: ValidateArgs) => ValidateResult;

  buildExistingTenantPayload: (
    args: BuildPayloadArgs
  ) => BuildExistingTenantPayloadResult;

  buildNewTenantLeasePayload: (
    args: BuildPayloadArgs
  ) => BuildNewTenantLeasePayloadResult;
};