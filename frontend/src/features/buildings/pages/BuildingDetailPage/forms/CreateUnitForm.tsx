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
 * - "inline": renders only the form body shell. Parent controls visibility.
 *
 * orgSlug:
 * - Optional. If not provided, fallback to OrgProvider via `useOrg()`.
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

  // Step 3: Invalid numeric -> null (validated separately where needed)
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

  // Step 3: Prefer non_field_errors
  const nonField = maybe.non_field_errors;
  if (Array.isArray(nonField) && nonField.length > 0) {
    const msg = String(nonField[0]);

    // Step 4: Friendly uniqueness message
    if (msg.toLowerCase().includes("must make a unique set")) {
      return "That unit label already exists for this building. Please choose a different label (for example: B2, 2A, Basement).";
    }

    return msg;
  }

  // Step 5: Fall back to label field errors
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
 * - standalone: includes its own header and internal toggle
 * - inline: full premium form shell for embedding inside BuildingUnitsSection
 */
export default function CreateUnitForm({
  buildingId,
  variant = "standalone",
  orgSlug: orgSlugProp,
  onSuccess,
  onCancel,
}: CreateUnitFormProps) {
  // Step 1: Resolve org slug
  const { orgSlug: orgSlugFromContext } = useOrg();
  const orgSlug = orgSlugProp ?? orgSlugFromContext;

  const isInline = variant === "inline";

  // Step 2: Internal open/close state (standalone only)
  const [isOpen, setIsOpen] = useState(false);

  // Step 3: UI form values
  const [label, setLabel] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: Local UX error state
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 5: Mutation
  const createUnitMutation = useCreateUnitMutation({
    orgSlug,
    buildingId,
  });

  // Step 6: Derived state
  const isSaving = createUnitMutation.isPending;

  const canSubmit = useMemo(() => {
    if (!orgSlug) return false;
    if (!label.trim()) return false;
    return true;
  }, [label, orgSlug]);

  // Step 7: Helpers
  const resetForm = useCallback(() => {
    setLabel("");
    setBedrooms("");
    setBathrooms("");
    setSquareFeet("");
    setNotes("");
    setLocalError(null);
  }, []);

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20";

  const textareaClassName =
    "mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20";

  const toggleOpen = useCallback(() => {
    setIsOpen((v) => !v);
    setLocalError(null);
    createUnitMutation.reset();
  }, [createUnitMutation]);

  const handleCancel = useCallback(() => {
    // Step 1: Reset local state
    resetForm();
    createUnitMutation.reset();

    // Step 2: Let parent close inline mode
    if (isInline) {
      onCancel?.();
      return;
    }

    // Step 3: Standalone closes itself
    setIsOpen(false);
  }, [createUnitMutation, isInline, onCancel, resetForm]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Step 1: Clear prior errors
      setLocalError(null);
      createUnitMutation.reset();

      // Step 2: Guard org
      if (!orgSlug) {
        setLocalError("Organization not selected. Add ?org=<slug> to the URL.");
        return;
      }

      // Step 3: Required field validation
      if (!label.trim()) {
        setLocalError("Unit label is required (for example: 'Unit 2A').");
        return;
      }

      // Step 4: Build payload
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

        // Step 6: Reset + notify parent
        resetForm();
        onSuccess?.();

        // Step 7: Standalone closes itself
        if (!isInline) {
          setIsOpen(false);
        }
      } catch (err) {
        // Step 8: Decode DRF-friendly error
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

  // Step 8: Shared form body
  const formBody = (
    <form onSubmit={onSubmit} className="space-y-6">
      {(localError || createUnitMutation.error) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {localError ?? createUnitMutation.error?.message}
        </div>
      )}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="border-b border-neutral-800 px-5 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Unit details
            </p>
            <h4 className="text-lg font-semibold text-white">Identity and layout</h4>
            <p className="text-sm text-neutral-400">
              Define the unit label and optional physical details.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-300">
              Label <span className="text-red-300">*</span>
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 2nd floor, 1A, B2"
              className={inputClassName}
            />
            <div className="mt-2 text-xs text-neutral-500">
              Must be unique within this building.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300">
              Bedrooms
            </label>
            <input
              inputMode="decimal"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="e.g. 2 or 2.5"
              className={inputClassName}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300">
              Bathrooms
            </label>
            <input
              inputMode="decimal"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="e.g. 1 or 1.5"
              className={inputClassName}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-300">
              Square feet
            </label>
            <input
              inputMode="numeric"
              value={squareFeet}
              onChange={(e) => setSquareFeet(e.target.value)}
              placeholder="e.g. 850"
              className={inputClassName}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this unit..."
              rows={4}
              className={textareaClassName}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-5">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-2xl border border-neutral-700 bg-transparent px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-900 disabled:opacity-50"
          disabled={isSaving}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!canSubmit || isSaving}
          className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {isSaving ? "Creating..." : "Create unit"}
        </button>
      </div>
    </form>
  );

  // Step 9: Inline variant
  if (isInline) {
    return (
      <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800/80 px-5 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Unit creation
            </p>

            <h3 className="text-lg font-semibold tracking-tight text-white">
              Add unit
            </h3>

            <p className="text-sm text-neutral-400">
              Create a new unit under this building. Labels must be unique within
              the building.
            </p>
          </div>
        </div>

        <div className="px-5 py-5">{formBody}</div>
      </div>
    );
  }

  // Step 10: Standalone variant
  return (
    <div className="rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-800/80 px-5 py-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Unit creation
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-white">
            Units
          </h3>
          <p className="text-sm text-neutral-400">
            Add units under this building. This workflow is org-scoped.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleOpen}
          className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          {isOpen ? "Close" : "Add unit"}
        </button>
      </div>

      {isOpen ? <div className="px-5 py-5">{formBody}</div> : null}
    </div>
  );
}