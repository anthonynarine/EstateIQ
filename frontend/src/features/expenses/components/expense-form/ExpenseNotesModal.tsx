// # Filename: src/features/expenses/components/expense-form/ExpenseNotesModal.tsx

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

interface ExpenseNotesModalProps {
  isOpen: boolean;
  initialValue?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function ExpenseNotesModal({
  isOpen,
  initialValue = "",
  onClose,
  onSave,
}: ExpenseNotesModalProps) {
  const [draftValue, setDraftValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setDraftValue(initialValue);
    }
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // # Step 1: Allow Escape to close the modal.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const hasNote = draftValue.trim().length > 0;

  const handleSave = () => {
    onSave(draftValue.trim());
  };

  const handleRemove = () => {
    onSave("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="expense-notes-modal-title"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-300" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Expense notes
              </p>
            </div>

            <h2
              id="expense-notes-modal-title"
              className="mt-2 text-xl font-semibold tracking-tight text-white"
            >
              {hasNote ? "Edit internal note" : "Add internal note"}
            </h2>

            <p className="mt-1 text-sm text-neutral-400">
              Notes stay attached to the expense form and submit with the record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Close notes modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col gap-3">
            <label
              htmlFor="expense-notes-textarea"
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500"
            >
              Note
            </label>

            <textarea
              id="expense-notes-textarea"
              rows={8}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              placeholder="Add optional internal context for this expense..."
              className="min-h-[220px] w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none ring-1 ring-white/[0.04] transition focus:border-cyan-400/25 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15"
            />

            <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
              <span>
                {hasNote
                  ? "This note is only saved to the form when you click Save note."
                  : "Leave empty to keep this expense without an internal note."}
              </span>

              <span>{draftValue.length} characters</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {hasNote ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
              >
                Remove note
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/[0.08] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/15 hover:text-cyan-100"
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}