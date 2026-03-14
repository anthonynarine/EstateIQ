// # Filename: src/features/leases/forms/EditLeaseForm/reducer.ts


import type { Lease } from "../../api/types";
import { getPrimaryTenantId } from "../../utils/leaseParty";
import type {
  EditLeaseFormAction,
  EditLeaseFormResetContext,
  EditLeaseFormState,
} from "./types";

/**
 * createInitialEditLeaseFormState
 *
 * Builds reducer state from the authoritative lease read model.
 *
 * @param context Reset context with current lease
 * @returns Initialized edit-form state
 */
export function createInitialEditLeaseFormState(
  context: EditLeaseFormResetContext
): EditLeaseFormState {
  const { lease } = context;
  const primaryTenantId = getPrimaryTenantId(lease);

  return {
    startDate: lease.start_date,
    endDate: lease.end_date ?? "",
    rentAmount: lease.rent_amount ?? "",
    rentDueDay: String(lease.rent_due_day ?? 1),
    securityDeposit: lease.security_deposit_amount ?? "",
    status: lease.status,
    primaryTenantId,
    tenantMode: "select",
    tenantCreateDraft: {
      full_name: "",
      email: "",
      phone: "",
    },
    localError: null,
  };
}

/**
 * editLeaseFormReducer
 *
 * Reducer for the lease edit workflow.
 *
 * @param state Current state
 * @param action Next action
 * @returns Updated state
 */
export function editLeaseFormReducer(
  state: EditLeaseFormState,
  action: EditLeaseFormAction
): EditLeaseFormState {
  switch (action.type) {
    case "SET_START_DATE":
      return {
        ...state,
        startDate: action.payload,
      };

    case "SET_END_DATE":
      return {
        ...state,
        endDate: action.payload,
      };

    case "SET_RENT_AMOUNT":
      return {
        ...state,
        rentAmount: action.payload,
      };

    case "SET_RENT_DUE_DAY":
      return {
        ...state,
        rentDueDay: action.payload,
      };

    case "SET_SECURITY_DEPOSIT":
      return {
        ...state,
        securityDeposit: action.payload,
      };

    case "SET_STATUS":
      return {
        ...state,
        status: action.payload,
      };

    case "SET_PRIMARY_TENANT_ID":
      return {
        ...state,
        primaryTenantId: action.payload,
        localError: null,
      };

    case "SET_TENANT_MODE":
      return {
        ...state,
        tenantMode: action.payload,
        localError: null,
      };

    case "SET_TENANT_CREATE_DRAFT":
      return {
        ...state,
        tenantCreateDraft: action.payload,
        localError: null,
      };

    case "SET_LOCAL_ERROR":
      return {
        ...state,
        localError: action.payload,
      };

    case "ENTER_CREATE_TENANT_MODE":
      return {
        ...state,
        tenantMode: "create",
        primaryTenantId: null,
        localError: null,
      };

    case "ENTER_SELECT_TENANT_MODE":
      return {
        ...state,
        tenantMode: "select",
        localError: null,
      };

    case "SELECT_EXISTING_TENANT":
      return {
        ...state,
        tenantMode: "select",
        primaryTenantId: action.payload,
        localError: null,
      };

    case "RESET_FORM":
      return createInitialEditLeaseFormState(action.payload);

    default:
      return state;
  }
}