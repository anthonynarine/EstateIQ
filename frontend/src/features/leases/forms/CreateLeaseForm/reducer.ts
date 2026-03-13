// # Filename: src/features/leases/forms/CreateLeaseForm/reducer.ts



import type { TenantCreateDraft } from "../TenantSection/tenantTypes";
import type {
  CreateLeaseFormAction,
  CreateLeaseFormResetContext,
  CreateLeaseFormState,
} from "./types";

const EMPTY_TENANT_DRAFT: TenantCreateDraft = {
  full_name: "",
  email: "",
  phone: "",
};

/**
 * createInitialCreateLeaseFormState
 *
 * Builds the initial form state from normalized launch context.
 *
 * @param resetContext Normalized reset context
 * @returns Initial create lease form state
 */
export function createInitialCreateLeaseFormState(
  resetContext: CreateLeaseFormResetContext
): CreateLeaseFormState {
  // Step 1: Return canonical initial state
  return {
    startDate: "",
    endDate: "",
    rentAmount: "",
    rentDueDay: "1",
    securityDeposit: "",
    status: "active",

    primaryTenantId: resetContext.initialTenantId,
    tenantMode: "select",
    tenantCreateDraft: EMPTY_TENANT_DRAFT,

    selectedBuildingId: resetContext.initialBuildingId,
    selectedUnitId: resetContext.initialUnitId,

    localError: null,
  };
}

/**
 * createLeaseFormReducer
 *
 * Reducer for the create lease workflow.
 *
 * @param state Current form state
 * @param action Reducer action
 * @returns Next form state
 */
export function createLeaseFormReducer(
  state: CreateLeaseFormState,
  action: CreateLeaseFormAction
): CreateLeaseFormState {
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
      };

    case "SET_TENANT_MODE":
      return {
        ...state,
        tenantMode: action.payload,
      };

    case "SET_TENANT_CREATE_DRAFT":
      return {
        ...state,
        tenantCreateDraft: action.payload,
      };

    case "SET_SELECTED_BUILDING_ID":
      return {
        ...state,
        selectedBuildingId: action.payload,
      };

    case "SET_SELECTED_UNIT_ID":
      return {
        ...state,
        selectedUnitId: action.payload,
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
      };

    case "ENTER_SELECT_TENANT_MODE":
      return {
        ...state,
        tenantMode: "select",
        tenantCreateDraft: EMPTY_TENANT_DRAFT,
      };

    case "SELECT_EXISTING_TENANT":
      return {
        ...state,
        tenantMode: "select",
        primaryTenantId: action.payload,
        tenantCreateDraft: EMPTY_TENANT_DRAFT,
      };

    case "CHANGE_BUILDING":
      return {
        ...state,
        selectedBuildingId: action.payload,
        selectedUnitId: null,
      };

    case "CHANGE_UNIT":
      return {
        ...state,
        selectedUnitId: action.payload,
      };

    case "RESET_FORM":
      return createInitialCreateLeaseFormState(action.payload);

    default:
      return state;
  }
}