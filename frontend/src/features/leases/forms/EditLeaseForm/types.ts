// # Filename: src/features/leases/forms/EditLeaseForm/types.ts


import type { Lease, LeaseStatus, UpdateLeaseInput } from "../../api/types";
import type { TenantMode } from "../TenantSection/tenantTypes";

export interface EditTenantCreateDraft {
  full_name: string;
  email: string;
  phone: string;
}

export interface EditLeaseFormState {
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;
  primaryTenantId: number | null;
  tenantMode: TenantMode;
  tenantCreateDraft: EditTenantCreateDraft;
  localError: string | null;
}

export interface EditLeaseFormResetContext {
  lease: Lease;
}

export type EditLeaseFormAction =
  | { type: "SET_START_DATE"; payload: string }
  | { type: "SET_END_DATE"; payload: string }
  | { type: "SET_RENT_AMOUNT"; payload: string }
  | { type: "SET_RENT_DUE_DAY"; payload: string }
  | { type: "SET_SECURITY_DEPOSIT"; payload: string }
  | { type: "SET_STATUS"; payload: LeaseStatus }
  | { type: "SET_PRIMARY_TENANT_ID"; payload: number | null }
  | { type: "SET_TENANT_MODE"; payload: TenantMode }
  | { type: "SET_TENANT_CREATE_DRAFT"; payload: EditTenantCreateDraft }
  | { type: "SET_LOCAL_ERROR"; payload: string | null }
  | { type: "ENTER_CREATE_TENANT_MODE" }
  | { type: "ENTER_SELECT_TENANT_MODE" }
  | { type: "SELECT_EXISTING_TENANT"; payload: number | null }
  | { type: "RESET_FORM"; payload: EditLeaseFormResetContext };

export interface ValidateResult {
  ok: true;
}

export interface ValidateErrorResult {
  ok: false;
  message: string;
}

export type EditLeaseValidateResult = ValidateResult | ValidateErrorResult;

export interface UseEditLeaseFormReturn {
  startDate: string;
  endDate: string;
  rentAmount: string;
  rentDueDay: string;
  securityDeposit: string;
  status: LeaseStatus;
  primaryTenantId: number | null;
  tenantMode: TenantMode;
  tenantCreateDraft: EditTenantCreateDraft;
  localError: string | null;

  initialPrimaryTenantId: number | null;
  requiresTenantRepair: boolean;
  hasTenantChanged: boolean;

  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setRentAmount: (value: string) => void;
  setRentDueDay: (value: string) => void;
  setSecurityDeposit: (value: string) => void;
  setStatus: (value: LeaseStatus) => void;
  setPrimaryTenantId: (value: number | null) => void;
  setTenantMode: (value: TenantMode) => void;
  setTenantCreateDraft: (value: EditTenantCreateDraft) => void;
  setLocalError: (value: string | null) => void;

  enterCreateTenantMode: () => void;
  selectExistingTenant: (tenantId: number | null) => void;
  onTenantModeChange: (mode: TenantMode) => void;
  reset: () => void;
  validate: () => EditLeaseValidateResult;
  buildTermsPatch: () => UpdateLeaseInput;
}