// # Filename: src/features/buildings/components/CreateUnitForm.tsx


import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { useOrg } from "../../../../tenancy/hooks/useOrg";
import { useCreateUnitMutation } from "../hooks/useCreateUnitMutation";


/**
 * CreateUnitFormProps
 *
 * buildingId:
 * - Parent Building ID (required).
 *
 * variant:
 * - "standalone": renders its own header + internal open/close toggle (default)
 * - "inline": renders only the form body (no header, no toggle). Parent controls visibility.
 *
 * orgSlug:
 * - Optional. If not provided, we fallback to OrgProvider via `useOrg()`.
 *
 * onSuccess:
 * - Called after successful creation. Use this to close parent dropdown.
 *
 * onCancel:
 * - Called when user clicks Cancel (inline mode usually).
 */
type CreateUnitFormProps = {
  buildingId: number;
  variant?: "standalone" | "inline";
  orgSlug?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

/**
 * parseNullableNumber
 *
 * Converts string input into:
 * - null (empty string)
 * - number (valid numeric)
 *
 * Args:
 *   value: string input from form control
 *
 * Returns:
 *   number | null
 */
function parseNullableNumber(value: string): number | null {
  // Step 1: Empty becomes null
  if (value.trim() === "") return null;

  // Step 2: Numeric conversion
  const n = Number(value);

  // Step 3: Invalid numeric -> null (we validate separately for required fields)
  if (!Number.isFinite(n)) return null;

  return n;
}

/**
 * extractDrfErrorMessage
 *
 * Extracts a human-friendly message from DRF error payloads.
 *
 * Common DRF payload shapes:
 * - { non_field_errors: ["..."] }
 * - { field_name: ["..."] }
 * - { detail: "..." }
 *
 * Returns:
 *   string | null
 */
function extractDrfErrorMessage(error: unknown): string | null {
  // Step 1: Only handle Axios errors with response payloads
  if (!axios.isAxiosError(error)) return null;

  const data = error.response?.data as unknown;

  // Step 2: DRF typically returns an object of arrays/strings
  if (!data || typeof data !== "object") return null;

  const maybe = data as Record<string, unknown>;

  // Step 3: Prefer non_field_errors (constraint errors often land here)
  const nonField = maybe.non_field_errors;
  if (Array.isArray(nonField) && nonField.length > 0) {
    const msg = String(nonField[0]);

    // Step 4: Special-case the unique constraint to make it user-friendly
    if (msg.toLowerCase().includes("must make a unique set")) {
      return "That unit label already exists for this building. Please choose a different label (e.g., B2, 2A, Basement).";
    }

    return msg;
  }

  // Step 5: Fall back to label field errors if present
  const labelErrors = maybe.label;
  if (Array.isArray(labelErrors) && labelErrors.length > 0) {
    return String(labelErrors[0]);
  }

  // Step 6: DRF sometimes uses `detail`
  const detail = maybe.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return null;
}

/**
 * CreateUnitForm
 *
 * Unit create form that can render in two modes:
 * - standalone: includes its own header and an internal open/close toggle
 * - inline: form-only (no header/toggle). Parent controls visibility.
 */
export default function CreateUnitForm({
  buildingId,
  variant = "standalone",
  orgSlug: orgSlugProp,
  onSuccess,
  onCancel,
}: CreateUnitFormProps) {
  // Step 1: Resolve org slug (prefer prop; fallback to context)
  const { orgSlug: orgSlugFromContext } = useOrg();
  const orgSlug = orgSlugProp ?? orgSlugFromContext;

  const isInline = variant === "inline";

  // Step 2: Internal open/close state ONLY for standalone mode
  const [isOpen, setIsOpen] = useState(false);

  // Step 3: UI form values (strings)
  const [label, setLabel] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: Local error state (for UX; API errors are also shown)
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 5: Mutation
  const createUnitMutation = useCreateUnitMutation({
    orgSlug,
    buildingId,
  });

  // Step 6: Derived loading state
  const isSaving = createUnitMutation.isPending;

  // Step 7: Reset helper
  const resetForm = useCallback(() => {
    setLabel("");
    setBedrooms("");
    setBathrooms("");
    setSquareFeet("");
    setNotes("");
    setLocalError(null);
  }, []);

  // Step 8: Client-side validation (minimal but strict)
  const canSubmit = useMemo(() => {
    if (!orgSlug) return false;
    if (!label.trim()) return false;
    return true;
  }, [label, orgSlug]);

  const toggleOpen = useCallback(() => {
    setIsOpen((v) => !v);
    setLocalError(null);
    createUnitMutation.reset();
  }, [createUnitMutation]);

  const handleCancel = useCallback(() => {
    resetForm();
    createUnitMutation.reset();

    if (isInline) {
      onCancel?.();
      return;
    }

    setIsOpen(false);
  }, [createUnitMutation, isInline, onCancel, resetForm]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Step 1: Clear prior errors
      setLocalError(null);
      createUnitMutation.reset();

      // Step 2: Guard org (hard boundary)
      if (!orgSlug) {
        setLocalError("Organization not selected. Add ?org=<slug> to URL.");
        return;
      }

      // Step 3: Required field validation
      if (!label.trim()) {
        setLocalError("Unit label is required (e.g., 'Unit 2A').");
        return;
      }

      // Step 4: Convert numeric fields safely
      const payload = {
        label: label.trim(),
        bedrooms: parseNullableNumber(bedrooms),
        bathrooms: parseNullableNumber(bathrooms),
        square_feet: parseNullableNumber(squareFeet),
        notes: notes.trim() ? notes.trim() : null,
      };

      try {
        // Step 5: Execute mutation
        await createUnitMutation.mutateAsync(payload);

        // Step 6: Reset and notify parent
        resetForm();
        onSuccess?.();

        // Step 7: Standalone closes itself; inline is controlled by parent
        if (!isInline) {
          setIsOpen(false);
        }
      } catch (err) {
        // Step 8: Decode DRF errors into a friendly message
        const drfMessage = extractDrfErrorMessage(err);
        if (drfMessage) {
          setLocalError(drfMessage);
        }

        // eslint-disable-next-line no-console
        console.error("createUnit failed:", err);
      }
    },
    [
      bathrooms,
      bedrooms,
      createUnitMutation,
      isInline,
      label,
      notes,
      onSuccess,
      orgSlug,
      resetForm,
      squareFeet,
    ]
  );

  // Step 9: Shared form body (used by both variants)
  const formBody = (
    <form onSubmit={onSubmit} className={isInline ? "" : "border-t border-white/10 p-4"}>
      {(localError || createUnitMutation.error) && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {localError ?? createUnitMutation.error?.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-white/70">
            Label <span className="text-red-300">*</span>
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., 2nd floor, 1A, B2"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
          <div className="mt-1 text-[11px] text-white/50">
            Must be unique within this building (e.g., B1, B2, 1A, 1B).
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70">Bedrooms</label>
          <input
            inputMode="decimal"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder="e.g., 2 or 2.5"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70">Bathrooms</label>
          <input
            inputMode="decimal"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            placeholder="e.g., 1 or 1.5"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-white/70">Square Feet</label>
          <input
            inputMode="numeric"
            value={squareFeet}
            onChange={(e) => setSquareFeet(e.target.value)}
            placeholder="e.g., 850"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-white/70">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs text-white/70 hover:bg-white/5"
          disabled={isSaving}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!canSubmit || isSaving}
          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isSaving ? "Creating..." : "Create unit"}
        </button>
      </div>
    </form>
  );

  // Step 10: Inline variant = form only (NO header/toggle/panel)
  if (isInline) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        {formBody}
      </div>
    );
  }

  // Step 11: Standalone variant = your existing panel + internal toggle
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-sm font-semibold text-white">Units</div>
          <div className="mt-1 text-xs text-white/60">
            Add units under this building (org-scoped).
          </div>
        </div>

        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs text-white/80 hover:bg-white/5"
        >
          {isOpen ? "Close" : "Add unit"}
        </button>
      </div>

      {isOpen ? formBody : null}
    </div>
  );
}