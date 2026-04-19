// # Filename: src/features/billing/pages/leaseLedgerPage/LeaseLedgerActivityPanel.tsx


import CollectionPaginationFooter from "../../../../components/pagination/CollectionPaginationFooter";
import AllocationsTable from "../../components/AllocationsTable";
import ChargesTable from "../../components/chargesTable/ChargesTable";
import PaymentsTable from "../../components/PaymentsTable";
import type {
  LeaseLedgerAllocation,
  LeaseLedgerCharge,
  LeaseLedgerPayment,
} from "../../api/types";

/**
 * LedgerActivityTab
 *
 * Supported activity tabs for the lease ledger workspace.
 */
export type LedgerActivityTab = "charges" | "payments" | "allocations";

/**
 * LedgerTabMeta
 *
 * UI metadata for each ledger activity tab.
 */
export interface LedgerTabMeta {
  key: LedgerActivityTab;
  label: string;
  count: number;
}

/**
 * LeaseLedgerActivityPanelProps
 *
 * Props for the unified lease-ledger activity panel.
 */
interface LeaseLedgerActivityPanelProps {
  activeLedgerTab: LedgerActivityTab;
  ledgerTabMeta: LedgerTabMeta[];
  isLoading: boolean;
  visibleCharges: LeaseLedgerCharge[];
  visiblePayments: LeaseLedgerPayment[];
  visibleAllocations: LeaseLedgerAllocation[];
  activePage: number;
  pageSize: number;
  activeCollectionCount: number;
  activityDescription: string;
  itemLabel: string;
  onLedgerTabChange: (tab: LedgerActivityTab) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPayCharge?: (charge: LeaseLedgerCharge) => void;
}

/**
 * LeaseLedgerActivityPanel
 *
 * Shared workspace panel for charges, payments, and allocations.
 *
 * Responsibilities:
 * - render the activity header
 * - render tab buttons and counts
 * - render the currently active table
 * - render shared pagination footer
 *
 * Important:
 * This component is presentation-oriented.
 * It should not own query orchestration or ledger business logic.
 *
 * @param props Panel display and interaction props.
 * @returns The lease ledger activity workspace panel.
 */
export default function LeaseLedgerActivityPanel({
  activeLedgerTab,
  ledgerTabMeta,
  isLoading,
  visibleCharges,
  visiblePayments,
  visibleAllocations,
  activePage,
  pageSize,
  activeCollectionCount,
  activityDescription,
  itemLabel,
  onLedgerTabChange,
  onPreviousPage,
  onNextPage,
  onPayCharge,
}: LeaseLedgerActivityPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800/80 px-5 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start xl:gap-5">
          <div className="min-w-0 max-w-[34rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Ledger activity
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Charges, payments, and allocation trail
            </h2>

            <p className="mt-1 text-sm text-neutral-400">
              {activityDescription}
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:flex-nowrap xl:justify-end xl:overflow-visible xl:pb-0">
            {ledgerTabMeta.map((tab) => {
              const isActive = activeLedgerTab === tab.key;

              return (
                <button
                  key={tab.key}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[15px] font-medium transition ${
                    isActive
                      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.06]"
                  }`}
                  onClick={() => {
                    onLedgerTabChange(tab.key);
                  }}
                  type="button"
                >
                  <span>{tab.label}</span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      isActive
                        ? "bg-cyan-400/15 text-cyan-100"
                        : "bg-white/[0.05] text-neutral-400"
                    }`}
                  >
                    {isLoading ? "—" : tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeLedgerTab === "charges" ? (
        <ChargesTable
          charges={visibleCharges}
          isLoading={isLoading}
          onPayCharge={onPayCharge}
          variant="embedded"
        />
      ) : null}

      {activeLedgerTab === "payments" ? (
        <PaymentsTable
          isLoading={isLoading}
          payments={visiblePayments}
          variant="embedded"
        />
      ) : null}

      {activeLedgerTab === "allocations" ? (
        <AllocationsTable
          allocations={visibleAllocations}
          isLoading={isLoading}
          variant="embedded"
        />
      ) : null}

      {!isLoading && activeCollectionCount > pageSize ? (
        <CollectionPaginationFooter
          itemLabel={itemLabel}
          page={activePage}
          pageSize={pageSize}
          totalCount={activeCollectionCount}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
        />
      ) : null}
    </section>
  );
}