// ✅ New Code

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReportingMonthlyTrendPoint } from "../utils/reportingSelectors";
import { formatCurrency } from "../utils/reportingFormatters";

/**
 * Props for the ReportingTrendTable component.
 */
interface ReportingTrendTableProps {
  points: ReportingMonthlyTrendPoint[];
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: {
      month: string;
      total: number;
    };
  }>;
  label?: string;
}

/**
 * Custom tooltip for the monthly trend chart.
 *
 * @param props Tooltip props from Recharts.
 * @returns Tooltip UI.
 */
function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  // # Step 1: Guard against inactive tooltip states.
  if (!active || !payload?.length) {
    return null;
  }

  const currentPoint = payload[0]?.payload;

  if (!currentPoint) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {formatCurrency(currentPoint.total)}
      </p>
    </div>
  );
}

/**
 * ReportingTrendTable
 *
 * Hero monthly trend chart for the reporting workspace.
 *
 * @param props Component props.
 * @returns Monthly trend reporting section.
 */
export default function ReportingTrendTable({
  points,
}: ReportingTrendTableProps) {
  // # Step 1: Track whether the exact detail table is expanded.
  const [showDetails, setShowDetails] = useState(false);

  // # Step 2: Prepare chart-safe summary values.
  const summary = useMemo(() => {
    const totalAcrossMonths = points.reduce(
      (runningTotal, point) => runningTotal + point.total,
      0,
    );

    const maxTotal = Math.max(...points.map((point) => point.total), 0);

    const peakPoint = points.reduce<ReportingMonthlyTrendPoint | null>(
      (currentPeak, point) => {
        if (!currentPeak || point.total > currentPeak.total) {
          return point;
        }

        return currentPeak;
      },
      null,
    );

    const chartData = points.map((point) => ({
      month: point.month,
      total: point.total,
    }));

    return {
      totalAcrossMonths,
      maxTotal,
      peakPoint,
      chartData,
    };
  }, [points]);

  // # Step 3: Render empty state when no monthly trend data exists.
  if (!points.length) {
    return (
      <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Trend analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Monthly trend
            </h3>

            <p className="text-sm leading-6 text-neutral-400">
              Expense totals by month for the current reporting range.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-5">
            <p className="text-sm text-neutral-400">
              No monthly trend data is available for the current filter set.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="border-b border-neutral-800 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Trend analysis
            </p>

            <h3 className="text-xl font-semibold tracking-tight text-white">
              Monthly trend
            </h3>

            <p className="mt-1 text-sm leading-6 text-neutral-400">
              See how total expense volume moves across the selected months.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              {points.length} {points.length === 1 ? "month" : "months"}
            </span>

            <span className="inline-flex rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
              Total: {formatCurrency(summary.totalAcrossMonths)}
            </span>

            {summary.peakPoint ? (
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Peak: {summary.peakPoint.month}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
        <section
          aria-label="Monthly expense trend chart"
          className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Trend overview
              </h4>

              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Monthly expense movement for the active reporting filters.
              </p>
            </div>

            <span className="inline-flex self-start rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
              Max month: {formatCurrency(summary.maxTotal)}
            </span>
          </div>

          <div className="min-w-0 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={summary.chartData}
                margin={{
                  top: 8,
                  right: 8,
                  bottom: 8,
                  left: 0,
                }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tick={{ fill: "#a3a3a3", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                  tick={{ fill: "#737373", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={84}
                />

                <Tooltip content={<TrendTooltip />} />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#34d399", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#6ee7b7", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-800 pt-1">
          <div className="text-xs text-neutral-500">
            Exact monthly totals are available on demand.
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((currentValue) => !currentValue)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-800 hover:text-white"
          >
            <span>{showDetails ? "Hide details" : "Show details"}</span>

            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={`h-4 w-4 transition-transform ${
                showDetails ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {showDetails ? (
          <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
            <div className="border-b border-neutral-800 px-4 py-3">
              <h4 className="text-sm font-semibold text-white">
                Monthly detail
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-neutral-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      Month
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800">
                  {points.map((point, index) => (
                    <tr
                      key={`${point.month}-row-${index}`}
                      className="transition-colors hover:bg-neutral-900/60"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-neutral-200">
                        {point.month}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                        {formatCurrency(point.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}