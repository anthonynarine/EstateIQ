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
 *
 * Responsibilities:
 * - Owns controlled lease term state (string-first for inputs)
 * - Owns tenant UX state:
 *   - tenantMode: "select" (existing) or "create" (inline new)
 *   - primaryTenantId (select mode)
 *   - tenantCreateDraft (create mode)
 * - Client-side validation for:
 *   - required lease fields (start date, rent amount)
 *   - due day range (1–28)
 *   - create-mode requirement: tenant full_name
 * - Builds a DRF-ready lease payload:
 *   - Decimal-safe strings
 *   - nullable fields normalized
 *   - parties included only when selecting an existing tenant
 *
 * Non-responsibilities:
 * - No API calls (tenant creation + lease creation orchestration comes later)
 * - No server error normalization (handled by formatApiFormErrors)
 * - No org scoping (orgSlug lives in CreateLeaseForm)
 */
export function useCreateLeaseForm() {
  // Step 1: Lease term controlled state (string-based)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  // Step 2: Tenant selection state (select-mode only)
  const [primaryTenantId, setPrimaryTenantId] = useState<number | null>(null);

  // Step 3: Tenant UX state (best UX path)
  const [tenantMode, setTenantMode] = useState<TenantMode>("select");
  const [tenantCreateDraft, setTenantCreateDraft] =
    useState<TenantCreateDraft>(EMPTY_TENANT_DRAFT);

  // Step 4: Local validation message
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * enterCreateTenantMode
   *
   * Switch UI into "create tenant" mode.
   * - Clears any selected tenant because select/create are mutually exclusive.
   */
  const enterCreateTenantMode = () => {
    // Step 1: Switch to create mode
    setTenantMode("create");

    // Step 2: Clear selected tenant id
    setPrimaryTenantId(null);
  };

  /**
   * selectExistingTenant
   *
   * Switch UI into "select tenant" mode and set tenant id.
   * - Passing null means "no tenant selected".
   * - Clears create draft to avoid stale values when toggling back and forth.
   */
  const selectExistingTenant = (tenantId: number | null) => {
    // Step 1: Switch to select mode
    setTenantMode("select");

    // Step 2: Set selected tenant id (nullable)
    setPrimaryTenantId(tenantId);

    // Step 3: Clear create draft (optional but keeps UX clean)
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
    if (tenantMode === "create") {
      if (!tenantCreateDraft.full_name.trim()) {
        const msg = "Tenant full name is required.";
        setLocalError(msg);
        return { ok: false, message: msg };
      }
    }

    return { ok: true };
  };

  const buildPayload = (): BuildPayloadResult => {
    // Step 1: Normalize optional fields
    const normalizedEndDate = endDate.trim() ? endDate.trim() : null;
    const normalizedDeposit = securityDeposit.trim()
      ? securityDeposit.trim()
      : null;

    // Step 2: Normalize Decimal-safe strings
    const normalizedRent = rentAmount.trim();

    // Step 3: Normalize due day
    const dueDayNum = Number(rentDueDay);

    // Step 4: Parties only when selecting an existing tenant
    const parties: LeaseParty[] | undefined =
      tenantMode === "select" && primaryTenantId !== null
        ? [{ tenant_id: primaryTenantId, role: "primary" }]
        : undefined;

    // Step 5: Build payload
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

    // Step 4: Setters (keep available for flexibility)
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

    // Step 5: Preferred tenant actions for the new UX
    enterCreateTenantMode,
    selectExistingTenant,

    // Step 6: Helpers
    reset,
    validate,
    buildPayload,
  };
}