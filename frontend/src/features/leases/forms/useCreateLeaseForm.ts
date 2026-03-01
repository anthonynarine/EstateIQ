// # Filename: src/features/leases/forms/useCreateLeaseForm.ts

import { useState } from "react";
import type { LeaseStatus } from "../api/leaseApi";

type BuildPayloadResult = {
  payload: {
    start_date: string;
    end_date: string | null;
    rent_amount: string;
    security_deposit_amount: string | null;
    rent_due_day: number;
    status: LeaseStatus;
    parties?: Array<{ tenant_id: number; role: "primary" }>;
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
 * Form-state and client-side validation hook for CreateLeaseForm.
 *
 * Responsibilities:
 * - Owns controlled input state (string-first for inputs)
 * - Performs lightweight client validation (required fields, due day range)
 * - Builds a DRF-ready payload (Decimal-safe strings; nullable fields normalized)
 * - Exposes reset() for crisp UX on success/cancel
 *
 * Non-responsibilities:
 * - No API calls or mutations (handled by CreateLeaseForm + TanStack Query)
 * - No org scoping (orgSlug lives in the orchestrator)
 * - No server error normalization (formatApiFormErrors handles that)
 */
export function useCreateLeaseForm() {
  // Step 1: Controlled form state (string-based)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  // Step 2: Tenant selection (optional)
  const [primaryTenantId, setPrimaryTenantId] = useState<number | null>(null);

  // Step 3: Local validation message (fast feedback; separate from API errors)
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    // Step 1: Reset fields
    setStartDate("");
    setEndDate("");
    setRentAmount("");
    setRentDueDay("1");
    setSecurityDeposit("");
    setStatus("active");
    setPrimaryTenantId(null);
    setLocalError(null);
  };

  const validate = (): ValidateResult => {
    // Step 1: Clear old local error
    setLocalError(null);

    // Step 2: Required fields
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

    // Step 4: Parties (only if tenant selected)
    const parties =
      primaryTenantId === null
        ? undefined
        : [{ tenant_id: primaryTenantId, role: "primary" as const }];

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
    // Step 1: Values
    startDate,
    endDate,
    rentAmount,
    rentDueDay,
    securityDeposit,
    status,
    primaryTenantId,
    localError,

    // Step 2: Setters
    setStartDate,
    setEndDate,
    setRentAmount,
    setRentDueDay,
    setSecurityDeposit,
    setStatus,
    setPrimaryTenantId,
    setLocalError,

    // Step 3: API-friendly helpers
    reset,
    validate,
    buildPayload,
  };
}