// # Filename: src/features/expenses/components/CreateVendorModal.tsx

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness } from "lucide-react";

import type {
  CreateVendorFormErrors,
  CreateVendorFormValues,
} from "./createVendorFormTypes";

interface CreateVendorModalProps {
  isOpen: boolean;
  values: CreateVendorFormValues;
  errors: CreateVendorFormErrors;
  submitError?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onChange: (
    field: keyof CreateVendorFormValues,
    value: string,
  ) => void;
  onSubmit: () => Promise<void> | void;
}

/**
 * CreateVendorModal
 *
 * Dark, EstateIQ-aligned modal shell for creating vendors inline from
 * the expenses workflow.
 *
 * Production-grade goals:
 * - portal to document.body
 * - body scroll lock while open
 * - escape-to-close support
 * - initial focus on vendor name
 * - focus trap inside dialog
 * - visual alignment with other EstateIQ modals
 *
 * @param props Modal rendering and interaction props.
 * @returns Vendor creation modal rendered in a portal.
 */
export default function CreateVendorModal({
  isOpen,
  values,
  errors,
  submitError = null,
  isSubmitting = false,
  onClose,
  onChange,
  onSubmit,
}: CreateVendorModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const titleId = useMemo(
    () => "create-vendor-modal-title",
    [],
  );
  const descriptionId = useMemo(
    () => "create-vendor-modal-description",
    [],
  );

  useEffect(() => {
    // # Step 1: Do nothing when the modal is closed.
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      initialFocusRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      // # Step 2: Allow escape-to-close unless a submit is in progress.
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onClose();
        return;
      }

      // # Step 3: Keep keyboard focus trapped inside the modal.
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = dialogRef.current.querySelectorAll<
        HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement
      >(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      // # Step 4: Restore global document state on cleanup.
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    await onSubmit();
  };

  const handleBackdropMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const inputBaseClassName =
    "rounded-2xl border bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500";

  const defaultInputClassName =
    "border-white/10 focus:border-cyan-400/40 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-400/10";

  const errorInputClassName =
    "border-red-500/40 focus:border-red-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-red-500/10";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      onMouseDown={handleBackdropMouseDown}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-black/65" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-base font-semibold text-white">
              Create vendor
            </h3>
            <p
              id={descriptionId}
              className="mt-1 text-xs text-neutral-400"
            >
              Add a vendor without leaving expense entry.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-2">
              <BriefcaseBusiness className="h-4 w-4 text-cyan-300" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                Expense workflow
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Create a reusable vendor profile inline
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Save contact details once so future expense entry stays faster
                and more consistent.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          {submitError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              Failed to create vendor.
              <div className="mt-1 text-red-200/80">{submitError}</div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="vendor-name"
                className="text-sm font-medium text-neutral-200"
              >
                Vendor name
              </label>
              <input
                ref={initialFocusRef}
                id="vendor-name"
                type="text"
                value={values.name}
                onChange={(event) =>
                  onChange("name", event.target.value)
                }
                placeholder="Ex: Chase, Home Depot, PSE&amp;G"
                className={`${inputBaseClassName} ${
                  errors.name
                    ? errorInputClassName
                    : defaultInputClassName
                }`}
              />
              {errors.name ? (
                <p className="text-xs text-red-300">{errors.name}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="vendor-type"
                  className="text-sm font-medium text-neutral-200"
                >
                  Vendor type
                </label>
                <input
                  id="vendor-type"
                  type="text"
                  value={values.vendor_type}
                  onChange={(event) =>
                    onChange("vendor_type", event.target.value)
                  }
                  placeholder="Optional"
                  className={`${inputBaseClassName} ${defaultInputClassName}`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="vendor-contact-name"
                  className="text-sm font-medium text-neutral-200"
                >
                  Contact name
                </label>
                <input
                  id="vendor-contact-name"
                  type="text"
                  value={values.contact_name}
                  onChange={(event) =>
                    onChange("contact_name", event.target.value)
                  }
                  placeholder="Optional"
                  className={`${inputBaseClassName} ${defaultInputClassName}`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="vendor-email"
                  className="text-sm font-medium text-neutral-200"
                >
                  Email
                </label>
                <input
                  id="vendor-email"
                  type="email"
                  value={values.email}
                  onChange={(event) =>
                    onChange("email", event.target.value)
                  }
                  placeholder="Optional"
                  className={`${inputBaseClassName} ${defaultInputClassName}`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="vendor-phone"
                  className="text-sm font-medium text-neutral-200"
                >
                  Phone
                </label>
                <input
                  id="vendor-phone"
                  type="text"
                  value={values.phone}
                  onChange={(event) =>
                    onChange("phone", event.target.value)
                  }
                  placeholder="Optional"
                  className={`${inputBaseClassName} ${defaultInputClassName}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="vendor-notes"
                className="text-sm font-medium text-neutral-200"
              >
                Notes
              </label>
              <textarea
                id="vendor-notes"
                rows={4}
                value={values.notes}
                onChange={(event) =>
                  onChange("notes", event.target.value)
                }
                placeholder="Optional internal vendor notes"
                className={`${inputBaseClassName} ${defaultInputClassName}`}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}