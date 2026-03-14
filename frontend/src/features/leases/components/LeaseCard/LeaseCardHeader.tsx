// # Filename: src/features/leases/components/LeaseCard/LeaseCardHeader.tsx


import { CalendarDays, FileText } from "lucide-react";
import type { LeaseStatus } from "../../api/types";
import {
  formatDateRange,
  getStatusCopy,
  getStatusPillClasses,
} from "./formatters";

interface LeaseCardHeaderProps {
  title: string;
  status: LeaseStatus;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  leaseId: number;
  showDbId?: boolean;
}

/**
 * LeaseCardHeader
 *
 * Presentational header for the lease card.
 * Shows the card title, status pill, date range, and optional DB id.
 */
export default function LeaseCardHeader({
  title,
  status,
  startDate,
  endDate,
  leaseId,
  showDbId = false,
}: LeaseCardHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-cyan-400/10 p-2.5 ring-1 ring-cyan-400/15">
          <FileText className="h-5 w-5 text-cyan-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold tracking-tight text-white">
              {title}
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClasses(
                status
              )}`}
            >
              {getStatusCopy(status)}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-start gap-2 text-sm text-neutral-300">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate">
                {formatDateRange(startDate, endDate)}
              </span>
            </div>

            {showDbId ? (
              <p className="pl-6 text-xs text-neutral-500">Lease id: {leaseId}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}