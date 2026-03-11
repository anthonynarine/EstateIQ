// # Filename: src/features/leases/forms/useCreateLeaseForm.ts


import { useMemo, useState } from "react";
import type { CreateLeaseInput, LeaseStatus } from "../api/leaseApi";
import type { TenantCreateDraft, TenantMode } from "./TenantSection/tenantTypes";

const EMPTY_TENANT_DRAFT: TenantCreateDraft = {
  full_name: "",
  email: "",
  phone: "",
};

type LeaseParty = {
  tenant_id: number;
  role: "primary";
};

type UseCreateLeaseFormArgs = {
  initialTenantId?: number | null;
  initialBuildingId?: number | null;
  initialUnitId?: number | null;
};

type ResolveUnitArgs = {
  unitId: number | null;
};

type BuildPayloadArgs = {
  unitId: number | null;
};

type BuildPayloadResult = {
  payload: CreateLeaseInput;
};

type ValidateArgs = {
  unitId: number | null;
};

type ValidateResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

/**
 * isValidPositiveInt
 *
 * Checks whether a value is a finite positive integer.
 *
 * @param value Candidate number
 * @returns True when value is a positive integer
 */
function isValidPositiveInt(value: number | null | undefined): value is number {
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
  if (isValidPositiveInt(unitId)) {
    return unitId;
  }

  if (isValidPositiveInt(selectedUnitId)) {
    return selectedUnitId;
  }

  return null;
}

/**
 * useCreateLeaseForm
 *
 * Form-state + validation + payload builder for CreateLeaseForm.
 *
 * Supported launch modes:
 * - unit-first
 * - tenant-first
 * - tenant-and-unit
 * - blank/manual
 *
 * Current phase:
 * - Supports route-prefilled tenant context
 * - Supports route-prefilled building/unit context
 * - Supports manual building/unit selection for tenant-first and blank flows
 * - Preserves prefilled context on reset
 */
export function useCreateLeaseForm({
  initialTenantId = null,
  initialBuildingId = null,
  initialUnitId = null,
}: UseCreateLeaseFormArgs = {}) {
  const normalizedInitialTenantId = useMemo(() => {
    return isValidPositiveInt(initialTenantId) ? initialTenantId : null;
  }, [initialTenantId]);

  const normalizedInitialBuildingId = useMemo(() => {
    return isValidPositiveInt(initialBuildingId) ? initialBuildingId : null;
  }, [initialBuildingId]);

  const normalizedInitialUnitId = useMemo(() => {
    return isValidPositiveInt(initialUnitId) ? initialUnitId : null;
  }, [initialUnitId]);

  // Step 1: Lease term controlled state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  // Step 2: Tenant selection state
  const [primaryTenantId, setPrimaryTenantId] = useState<number | null>(
    normalizedInitialTenantId
  );

  // Step 3: Tenant UX state
  const [tenantMode, setTenantMode] = useState<TenantMode>("select");
  const [tenantCreateDraft, setTenantCreateDraft] =
    useState<TenantCreateDraft>(EMPTY_TENANT_DRAFT);

  // Step 4: Building + unit selection state
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
    normalizedInitialBuildingId
  );
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(
    normalizedInitialUnitId
  );

  // Step 5: Local validation message
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * enterCreateTenantMode
   *
   * Switch UI into create mode and clear any selected tenant.
   */
  const enterCreateTenantMode = () => {
    // Step 1: Switch to create mode
    setTenantMode("create");

    // Step 2: Clear selected tenant
    setPrimaryTenantId(null);
  };

  /**
   * selectExistingTenant
   *
   * Switch UI into select mode and set the current tenant id.
   *
   * @param tenantId Selected tenant id
   */
  const selectExistingTenant = (tenantId: number | null) => {
    // Step 1: Switch to select mode
    setTenantMode("select");

    // Step 2: Set selected tenant id
    setPrimaryTenantId(tenantId);

    // Step 3: Clear create draft
    setTenantCreateDraft(EMPTY_TENANT_DRAFT);
  };

  /**
   * onTenantModeChange
   *
   * Single safe mode-switching API for the UI.
   *
   * Behavior:
   * - "create": clears selected tenant id
   * - "select": preserves selected tenant if present and clears draft
   *
   * @param mode Next tenant mode
   */
  const onTenantModeChange = (mode: TenantMode) => {
    // Step 1: Move into create mode
    if (mode === "create") {
      setTenantMode("create");
      setPrimaryTenantId(null);
      return;
    }

    // Step 2: Move into select mode
    setTenantMode("select");
    setTenantCreateDraft(EMPTY_TENANT_DRAFT);
  };

  /**
   * onBuildingChange
   *
   * Updates the selected building and clears unit selection when the building changes.
   *
   * @param buildingId Selected building id
   */
  const onBuildingChange = (buildingId: number | null) => {
    // Step 1: Update building selection
    setSelectedBuildingId(buildingId);

    // Step 2: Clear dependent unit selection when building changes
    setSelectedUnitId(null);
  };

  /**
   * onUnitChange
   *
   * Updates the selected unit.
   *
   * @param unitId Selected unit id
   */
  const onUnitChange = (unitId: number | null) => {
    // Step 1: Update selected unit
    setSelectedUnitId(unitId);
  };

  /**
   * reset
   *
   * Resets the form but preserves route-prefilled launch context.
   */
  const reset = () => {
    // Step 1: Reset lease fields
    setStartDate("");
    setEndDate("");
    setRentAmount("");
    setRentDueDay("1");
    setSecurityDeposit("");
    setStatus("active");

    // Step 2: Reset tenant fields back to initial launch context
    setPrimaryTenantId(normalizedInitialTenantId);
    setTenantMode("select");
    setTenantCreateDraft(EMPTY_TENANT_DRAFT);

    // Step 3: Reset building/unit back to initial launch context
    setSelectedBuildingId(normalizedInitialBuildingId);
    setSelectedUnitId(normalizedInitialUnitId);

    // Step 4: Reset local error
    setLocalError(null);
  };

  /**
   * validate
   *
   * Validates the current form state before submit.
   *
   * @param args.unitId Route-prefilled unit id
   * @returns Validation result
   */
  const validate = ({ unitId }: ValidateArgs): ValidateResult => {
    // Step 1: Clear old local error
    setLocalError(null);

    // Step 2: Resolve effective unit
    const effectiveUnitId = resolveEffectiveUnitId(
      { unitId },
      selectedUnitId
    );

    // Step 3: Unit validation
    if (!isValidPositiveInt(effectiveUnitId)) {
      const msg = "A valid unit must be selected before creating a lease.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    // Step 4: Lease required fields
    if (!startDate.trim()) {
      const msg = "Start date is required.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    if (!rentAmount.trim()) {
      const msg = "Rent amount is required.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    // Step 5: Due day validation
    const dueDay = Number(rentDueDay);

    if (!Number.isFinite(dueDay)) {
      const msg = "Rent due day must be a valid number (1–28).";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    if (dueDay < 1 || dueDay > 28) {
      const msg = "Rent due day must be between 1 and 28.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    // Step 6: Optional date consistency
    if (endDate.trim() && endDate.trim() < startDate.trim()) {
      const msg = "End date cannot be earlier than start date.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    // Step 7: Tenant validation
    if (tenantMode === "create") {
      const msg =
        "Inline tenant creation is not yet supported in this shared lease flow. Select an existing tenant.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    if (!isValidPositiveInt(primaryTenantId)) {
      const msg = "A tenant must be selected before creating a lease.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    return { ok: true };
  };

  /**
   * buildPayload
   *
   * Builds the shared backend-supported lease create payload.
   *
   * @param args.unitId Route-prefilled unit id
   * @returns Shared create payload
   */
  const buildPayload = ({ unitId }: BuildPayloadArgs): BuildPayloadResult => {
    // Step 1: Resolve effective unit id
    const effectiveUnitId = resolveEffectiveUnitId(
      { unitId },
      selectedUnitId
    );

    // Step 2: Guard required ids
    if (!isValidPositiveInt(effectiveUnitId)) {
      throw new Error("Cannot build lease payload without a valid unit id.");
    }

    if (!isValidPositiveInt(primaryTenantId)) {
      throw new Error("Cannot build lease payload without a valid tenant id.");
    }

    // Step 3: Normalize optional fields
    const normalizedEndDate = endDate.trim() ? endDate.trim() : null;
    const normalizedDeposit = securityDeposit.trim()
      ? securityDeposit.trim()
      : null;

    // Step 4: Normalize decimal-safe strings
    const normalizedRent = rentAmount.trim();

    // Step 5: Normalize due day
    const dueDayNum = Number(rentDueDay);

    // Step 6: Build parties from selected tenant
    const parties: LeaseParty[] = [
      {
        tenant_id: primaryTenantId,
        role: "primary",
      },
    ];

    // Step 7: Build shared payload
    const payload: CreateLeaseInput = {
      unit: effectiveUnitId,
      start_date: startDate.trim(),
      end_date: normalizedEndDate,
      rent_amount: normalizedRent,
      security_deposit_amount: normalizedDeposit,
      rent_due_day: dueDayNum,
      status,
      parties,
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

    // Step 4: Local error
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

    // Step 6: Tenant actions
    enterCreateTenantMode,
    selectExistingTenant,
    onTenantModeChange,

    // Step 7: Unit actions
    onBuildingChange,
    onUnitChange,

    // Step 8: Helpers
    reset,
    validate,
    buildPayload,
  };
}