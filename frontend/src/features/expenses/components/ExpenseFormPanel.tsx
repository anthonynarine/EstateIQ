// # Filename: src/features/expenses/components/ExpenseFormPanel.tsx
// ✅ New Code

import { useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { expenseQueryKeys } from "../api/expenseQueryKeys";
import { createVendor } from "../api/expensesWriteApi";
import type {
  CreateExpensePayload,
  ExpenseCategoryOption,
  ExpenseVendorOption,
  UpdateExpensePayload,
} from "../api/expensesTypes";
import CreateVendorModal from "./create-vendor/CreateVendorModal";
import { useCreateVendorForm } from "./create-vendor/useCreateVendorForm";
import ExpenseFormActions from "./expense-form/ExpenseFormActions";
import ExpenseFormFields from "./expense-form/ExpenseFormFields";
import type { ExpenseFormValues } from "./expense-form/expenseFormTypes";
import { useExpenseForm } from "./expense-form/useExpenseForm";

type ExpenseFormSubmitPayload =
  | CreateExpensePayload
  | UpdateExpensePayload;

interface ExpenseFormPanelProps {
  mode: "create" | "edit";
  initialValues?: Partial<ExpenseFormValues>;
  categories: ExpenseCategoryOption[];
  vendors: ExpenseVendorOption[];
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmit: (values: ExpenseFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

function getVendorCreateErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }

    if (
      responseData &&
      typeof responseData === "object" &&
      "name" in responseData
    ) {
      const nameErrors = (responseData as { name?: unknown }).name;

      if (Array.isArray(nameErrors) && nameErrors.length > 0) {
        const firstError = nameErrors[0];

        if (typeof firstError === "string" && firstError.trim()) {
          return firstError;
        }
      }
    }

    if (
      responseData &&
      typeof responseData === "object" &&
      "detail" in responseData
    ) {
      const detail = (responseData as { detail?: unknown }).detail;

      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
  }

  return "Unable to create vendor. Please review the form and try again.";
}

export default function ExpenseFormPanel({
  mode,
  initialValues,
  categories,
  vendors,
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onCancel,
}: ExpenseFormPanelProps) {
  const queryClient = useQueryClient();

  const {
    formValues,
    validationError,
    panelTitle,
    panelDescription,
    updateField,
    handleSubmit,
  } = useExpenseForm({
    mode,
    initialValues,
    onSubmit,
  });

  const {
    values: vendorValues,
    errors: vendorErrors,
    updateField: updateVendorField,
    resetForm: resetVendorForm,
    buildPayload,
  } = useCreateVendorForm();

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorSubmitError, setVendorSubmitError] = useState<string | null>(
    null,
  );

  const createVendorMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: async (createdVendor) => {
      await queryClient.invalidateQueries({
        queryKey: expenseQueryKeys.vendors(),
      });

      updateField("vendor_id", createdVendor.id);
      resetVendorForm();
      setVendorSubmitError(null);
      setIsVendorModalOpen(false);
    },
    onError: (error) => {
      setVendorSubmitError(getVendorCreateErrorMessage(error));
    },
  });

  const combinedError = validationError ?? submitError;
  const isVendorCreateSubmitting = createVendorMutation.isPending;
  const isAddVendorDisabled = isSubmitting || isVendorCreateSubmitting;

  const handleOpenVendorModal = () => {
    setVendorSubmitError(null);
    setIsVendorModalOpen(true);
  };

  const handleCloseVendorModal = () => {
    if (isVendorCreateSubmitting) {
      return;
    }

    setVendorSubmitError(null);
    resetVendorForm();
    setIsVendorModalOpen(false);
  };

  const handleCreateVendor = async () => {
    const payload = buildPayload();

    if (!payload) {
      return;
    }

    setVendorSubmitError(null);
    await createVendorMutation.mutateAsync(payload);
  };

  return (
    <>
      <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-3 border-b border-neutral-800 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Expense workspace
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-white">
              {panelTitle}
            </h2>

            <p className="text-sm text-neutral-400">
              {panelDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-4">
          <form onSubmit={handleSubmit} className="flex h-full flex-col gap-3">
            {combinedError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {combinedError}
              </div>
            ) : null}

            <div className="flex-1">
              <ExpenseFormFields
                formValues={formValues}
                categories={categories}
                vendors={vendors}
                updateField={updateField}
                onAddVendorClick={handleOpenVendorModal}
                isAddVendorDisabled={isAddVendorDisabled}
              />
            </div>

            <ExpenseFormActions
              mode={mode}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
            />
          </form>
        </div>
      </section>

      <CreateVendorModal
        isOpen={isVendorModalOpen}
        values={vendorValues}
        errors={vendorErrors}
        submitError={vendorSubmitError}
        isSubmitting={isVendorCreateSubmitting}
        onClose={handleCloseVendorModal}
        onChange={updateVendorField}
        onSubmit={handleCreateVendor}
      />
    </>
  );
}