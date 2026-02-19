// # Filename: src/features/tenancy/components/UnitPicker.tsx
// ✅ New Code

import React, { useMemo } from "react";
import type { Unit } from "../types";

type Props = {
  units: Unit[];
  value: number | null;
  isLoading: boolean;
  onChange: (unitId: number) => void;
};

/**
 * UnitPicker
 *
 * Small dropdown that lets user select a unit.
 * This is an MVP bridge until a full Units page exists.
 */
export default function UnitPicker({ units, value, isLoading, onChange }: Props) {
  const options = useMemo(() => {
    return units.map((u) => {
      const label =
        u.name ||
        u.unit_number ||
        `Unit ${u.id}`;
      return { id: u.id, label };
    });
  }, [units]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Unit</span>

      <select
        className="min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50"
        value={value ?? ""}
        disabled={isLoading || options.length === 0}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {isLoading ? (
          <option value="">Loading units…</option>
        ) : options.length === 0 ? (
          <option value="">No units</option>
        ) : (
          <option value="" disabled>
            Select a unit…
          </option>
        )}

        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
