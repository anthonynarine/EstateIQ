
// # Filename: src/features/finance/components/PaymentCreateModal.tsx

import { useMemo, useState } from "react";
import { useCreatePaymentMutation } from "../../../api/paymentsApi";
import { useOrg } from "../../tenancy/hooks/useOrg";

type PaymentCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leaseId: number;
};

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PaymentCreateModal({ isOpen, onClose, leaseId }: PaymentCreateModalProps) {
  const { orgSlug } = useOrg();

  const mutation = useCreatePaymentMutation({
    orgSlug,
    leaseId,
  });

  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(todayISO());
  const [memo, setMemo] = useState<string>("");

  const amountNumber = useMemo(() => Number(amount), [amount]);
  const canSubmit =
    Boolean(orgSlug) &&
    Number.isFinite(leaseId) &&
    leaseId > 0 &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    Boolean(paymentDate) &&
    !mutation.isPending;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await mutation.mutateAsync({
        lease: leaseId,
        amount: amountNumber,
        payment_date: paymentDate,
        memo: memo.trim() || undefined,
        allocation_mode: "auto",
      });

      // Step 1: reset + close
      setAmount("");
      setMemo("");
      onClose();
    } catch (err) {
      // Step 1: mutation error state handles UI messaging
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Step 1: Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Step 2: Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Record Payment</div>
            <div className="mt-1 text-xs text-zinc-500">
              Default allocation mode: <span className="text-zinc-300">auto</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900/60"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          {/* Step 3: Amount */}
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              inputMode="decimal"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          {/* Step 4: Date */}
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          {/* Step 5: Memo */}
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Memo (optional)</label>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. February rent"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          {/* Step 6: Error */}
          {mutation.isError ? (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-300">
              Payment failed.
              <div className="mt-1 text-xs text-zinc-500">
                Where: POST /api/v1/payments/
                <br />
                Why: validation/auth/org scope
                <br />
                Fix: verify org selected and check Network headers (Bearer + X-Org-Slug)
              </div>
            </div>
          ) : null}

          {/* Step 7: Actions */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "w-full rounded-xl px-3 py-2 text-sm font-semibold",
              "border border-zinc-800",
              "bg-zinc-900/40 text-zinc-100 hover:bg-zinc-900/60",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {mutation.isPending ? "Saving…" : "Save Payment"}
          </button>
        </form>
      </div>
    </div>
  );
}