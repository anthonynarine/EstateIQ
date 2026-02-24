
// # Filename: src/features/buildings/pages/BuildingsPage.tsx

import { useMemo, useState } from "react";
import { formatApiError } from "../../../api/formatApiError";

import { useOrg } from "../../tenancy/context/OrgProvider";
import {
  useBuildingsQuery,
  useCreateBuildingMutation,
} from "../queries/useBuildings";

import type { Building, CreateBuildingInput } from "../api/buildingsApi";

/**
 * FormState
 *
 * UI-level form model for creating a building.
 * We keep this aligned with CreateBuildingInput to avoid mapping drift.
 */
type FormState = CreateBuildingInput;

type DRFPaginated<T> = {
  results: T[];
};


const EMPTY_FORM: FormState = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
  notes: "",
};

/**
 * validateBuildingForm
 *
 * Validates the create-building form.
 *
 * Returns:
 * - A map of field -> error message
 */
function validateBuildingForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) errors.name = "Building name is required.";
  if (!form.address_line1.trim()) errors.address_line1 = "Address line 1 is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.state.trim()) errors.state = "State is required.";
  if (!form.postal_code.trim()) errors.postal_code = "Postal code is required.";

  return errors;
}

/**
 * normalizeCreatePayload
 *
 * Converts form state into a clean API payload:
 * - trims all strings
 * - converts empty optionals to null
 */
function normalizeCreatePayload(form: FormState): CreateBuildingInput {
  return {
    name: form.name.trim(),
    address_line1: form.address_line1.trim(),
    address_line2: form.address_line2?.trim() ? form.address_line2.trim() : null,
    city: form.city.trim(),
    state: form.state.trim(),
    postal_code: form.postal_code.trim(),
    country: form.country?.trim() ? form.country.trim() : null,
    notes: form.notes?.trim() ? form.notes.trim() : null,
  };
}

/**
 * BuildingsPage
 *
 * Module D (Phase 1): Buildings CRUD (list + create).
 *
 * Enterprise principles enforced:
 * - No orgSlug => block org-scoped calls at UI level (no accidental data leakage).
 * - Query keys are tenant-safe: ["org", orgSlug, "buildings"].
 * - axios attaches X-Org-Slug centrally (no per-call header hacks).
 */
export default function BuildingsPage() {
  const { orgSlug } = useOrg();

  // Step 1: Org guard — orgSlug must exist for org-scoped endpoints
  const hasOrg = Boolean(orgSlug);

  // Step 2: Server state — queries are blocked when orgSlug is missing
  const buildingsQuery = useBuildingsQuery(orgSlug);
  const createMutation = useCreateBuildingMutation(orgSlug);

  // Step 3: UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const buildingsRaw = buildingsQuery.data as Building[] | DRFPaginated<Building> | undefined;

  const sortedBuildings = useMemo(() => {
    const buildings: Building[] = Array.isArray(buildingsRaw)
      ? buildingsRaw
      : Array.isArray(buildingsRaw?.results)
        ? buildingsRaw.results
        : [];

    return [...buildings].sort((a, b) => a.name.localeCompare(b.name));
  }, [buildingsRaw]);

  const isLoading = buildingsQuery.isLoading || buildingsQuery.isFetching;
  const listErrorText = buildingsQuery.error
    ? formatApiError(buildingsQuery.error)
    : null;

  const createErrorText = createMutation.error
    ? formatApiError(createMutation.error)
    : null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));

    // Step 2: Remove per-field error as user edits it
    setFormErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Step 1: Validate
    const errors = validateBuildingForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Step 2: Normalize
    const payload = normalizeCreatePayload(form);

    // Step 3: Create (mutation invalidates org buildings key on success)
    await createMutation.mutateAsync(payload);

    // Step 4: Reset UI
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsCreateOpen(false);
  }

  if (!hasOrg) {
    return (
      <div className="w-full max-w-[980px] mx-auto px-4 py-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h1 className="text-xl font-semibold text-white">Buildings</h1>
          <p className="mt-2 text-sm text-white/70">
            Select an organization first. This page is org-scoped and will not load without{" "}
            <span className="font-mono text-white/90">?org=&lt;slug&gt;</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[980px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Buildings</h1>
          <p className="mt-1 text-sm text-white/60">
            Org: <span className="font-mono text-white/80">{orgSlug}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen((v) => !v)}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 active:bg-white/20"
        >
          {isCreateOpen ? "Close" : "Add Building"}
        </button>
      </div>

      {/* Create Panel */}
      {isCreateOpen && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold text-white">Create building</h2>
          <p className="mt-1 text-sm text-white/60">
            This request is scoped by <span className="font-mono text-white/80">X-Org-Slug</span>{" "}
            added by axios from tokenStorage.
          </p>

          {createErrorText && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {createErrorText}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
            <Field
              label="Name *"
              value={form.name}
              placeholder="e.g. 123 Main St"
              error={formErrors.name}
              onChange={(v) => updateField("name", v)}
            />

            <Field
              label="Address line 1 *"
              value={form.address_line1}
              placeholder="Street address"
              error={formErrors.address_line1}
              onChange={(v) => updateField("address_line1", v)}
            />

            <Field
              label="Address line 2"
              value={form.address_line2 ?? ""}
              placeholder="Apt / floor / suite (optional)"
              error={formErrors.address_line2}
              onChange={(v) => updateField("address_line2", v)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field
                label="City *"
                value={form.city}
                placeholder="City"
                error={formErrors.city}
                onChange={(v) => updateField("city", v)}
              />
              <Field
                label="State *"
                value={form.state}
                placeholder="NY"
                error={formErrors.state}
                onChange={(v) => updateField("state", v)}
              />
              <Field
                label="Postal code *"
                value={form.postal_code}
                placeholder="11101"
                error={formErrors.postal_code}
                onChange={(v) => updateField("postal_code", v)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <label className="text-xs text-white/70">Notes</label>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                className="min-h-[96px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setFormErrors({});
                  setIsCreateOpen(false);
                }}
                className="h-11 rounded-xl border border-white/15 bg-transparent px-4 text-sm text-white/80 hover:bg-white/5"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white hover:bg-white/15 active:bg-white/20 disabled:opacity-50"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="mt-5">
        {listErrorText && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {listErrorText}
          </div>
        )}

        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Loading buildings...
          </div>
        )}

        {!isLoading && !listErrorText && sortedBuildings.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No buildings yet. Create your first building to continue.
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3">
          {sortedBuildings.map((b) => (
            <BuildingCard key={b.id} building={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Field
 *
 * Small reusable input field component (keeps page readable).
 */
function Field({
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <label className="text-xs text-white/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/25"
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

/**
 * BuildingCard
 *
 * Presentational card for a building record.
 * (Units view will be linked from here in Module E.)
 */
function BuildingCard({ building }: { building: Building }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{building.name}</h3>
          <p className="mt-1 text-sm text-white/70">
            {building.address_line1}
            {building.address_line2 ? `, ${building.address_line2}` : ""}
          </p>
          <p className="text-sm text-white/60">
            {building.city}, {building.state} {building.postal_code}
          </p>
        </div>

        <div className="text-xs text-white/50">#{building.id}</div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs text-white/80 hover:bg-white/5"
          disabled
          title="Coming next: Building detail + units"
        >
          View units (next)
        </button>
      </div>
    </div>
  );
}