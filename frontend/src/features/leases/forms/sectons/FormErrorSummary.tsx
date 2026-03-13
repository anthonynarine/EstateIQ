// # Filename: src/features/leases/forms/FormErrorSummary.tsx
// ✅ New Code

export type FormErrorAction = {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type Props = {
  title?: string;
  errors: string[];
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
    <div className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4 sm:p-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-red-200">{title}</div>

        <ul className="list-disc space-y-1 pl-5 text-sm text-red-100">
          {errors.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>

        {notes.length > 0 ? (
          <div className="space-y-1 pt-1 text-xs text-red-100/80">
            {notes.map((note, index) => (
              <div key={`${note}-${index}`}>{note}</div>
            ))}
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={
                  action.variant === "primary"
                    ? "rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
                    : "rounded-xl border border-red-200/20 bg-black/20 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-black/30"
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}