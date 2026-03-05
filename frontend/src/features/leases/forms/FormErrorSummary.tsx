// ✅ New Code
// # Filename: src/features/leases/forms/FormErrorSummary.tsx

export type FormErrorAction = {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type Props = {
  title?: string;
  errors: string[];

  // ✅ New Code
  actions?: FormErrorAction[];
  notes?: string[];
};

export default function FormErrorSummary({
  title = "Please fix the errors below",
  errors,
  actions = [],
  notes = [],
}: Props) {
  if (!errors.length) return null;

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
      <div className="font-semibold text-red-200">{title}</div>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100">
        {errors.map((m, i) => (
          <li key={`${m}-${i}`}>{m}</li>
        ))}
      </ul>

      {notes.length > 0 ? (
        <div className="mt-2 space-y-1 text-xs text-red-100/80">
          {notes.map((n, i) => (
            <div key={`${n}-${i}`}>{n}</div>
          ))}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              className={
                a.variant === "primary"
                  ? "rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  : "rounded-md border border-red-200/20 bg-black/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-black/30"
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}