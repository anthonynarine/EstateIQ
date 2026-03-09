// # Filename: src/features/leases/forms/useCreateLeaseForm.ts

import { useState } from "react";
import type { LeaseStatus } from "../api/leaseApi";
import type { TenantCreateDraft, TenantMode } from "./TenantSection/tenantTypes";

const EMPTY_TENANT_DRAFT: TenantCreateDraft = {
  full_name: "",
  email: "",
  phone: "",
};

type LeaseParty = { tenant_id: number; role: "primary" };

type BuildPayloadResult = {
  payload: {
    start_date: string;
    end_date: string | null;
    rent_amount: string;
    security_deposit_amount: string | null;
    rent_due_day: number;
    status: LeaseStatus;
    parties?: LeaseParty[];
  };
};

type ValidateResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

/**
 * useCreateLeaseForm
 *
 * Form-state + validation + payload builder for CreateLeaseForm.
 */
export function useCreateLeaseForm() {
  // Step 1: Lease term controlled state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  // Step 2: Tenant selection state
  const [primaryTenantId, setPrimaryTenantId] = useState<number | null>(null);

  // Step 3: Tenant UX state
  const [tenantMode, setTenantMode] = useState<TenantMode>("select");
  const [tenantCreateDraft, setTenantCreateDraft] =
    useState<TenantCreateDraft>(EMPTY_TENANT_DRAFT);

  // Step 4: Local validation message
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
   * Why this exists:
   * - Prevents the parent from using raw setTenantMode directly
   * - Keeps select/create transitions consistent
   * - Fixes toggle regressions when moving back from create -> select
   *
   * Behavior:
   * - "create": clears selected tenant id
   * - "select": keeps current selected tenant if any, and clears create draft
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

  const reset = () => {
    // Step 1: Reset lease fields
    setStartDate("");
    setEndDate("");
    setRentAmount("");
    setRentDueDay("1");
    setSecurityDeposit("");
    setStatus("active");

    // Step 2: Reset tenant fields
    setPrimaryTenantId(null);
    setTenantMode("select");
    setTenantCreateDraft(EMPTY_TENANT_DRAFT);

    // Step 3: Reset local error
    setLocalError(null);
  };

  const validate = (): ValidateResult => {
    // Step 1: Clear old local error
    setLocalError(null);

    // Step 2: Lease required fields
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

    // Step 3: Due day validation
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

    // Step 4: Tenant create-mode validation
    if (tenantMode === "create" && !tenantCreateDraft.full_name.trim()) {
      const msg = "Tenant full name is required.";
      setLocalError(msg);
      return { ok: false, message: msg };
    }

    return { ok: true };
  };

  const buildPayload = (): BuildPayloadResult => {
    // Step 1: Normalize optional fields
    const normalizedEndDate = endDate.trim() ? endDate.trim() : null;
    const normalizedDeposit = securityDeposit.trim()
      ? securityDeposit.trim()
      : null;

    // Step 2: Normalize decimal-safe strings
    const normalizedRent = rentAmount.trim();

    // Step 3: Normalize due day
    const dueDayNum = Number(rentDueDay);

    // Step 4: Parties only when selecting an existing tenant
    const parties: LeaseParty[] | undefined =
      tenantMode === "select" && primaryTenantId !== null
        ? [{ tenant_id: primaryTenantId, role: "primary" }]
        : undefined;

    const payload = {
      start_date: startDate.trim(),
      end_date: normalizedEndDate,
      rent_amount: normalizedRent,
      security_deposit_amount: normalizedDeposit,
      rent_due_day: dueDayNum,
      status,
      ...(parties ? { parties } : {}),
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

    // Step 3: Local error
    localError,

    // Step 4: Setters
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

    // Step 5: Tenant actions
    enterCreateTenantMode,
    selectExistingTenant,
    onTenantModeChange,

    // Step 6: Helpers
    reset,
    validate,
    buildPayload,
  };
}