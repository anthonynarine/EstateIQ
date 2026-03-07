// # Filename: src/features/tenants/components/shared/TenantStatusBadge.tsx


type Props = {
  status: string | null | undefined;
};

/**
 * getLeaseStatusLabel
 *
 * Converts backend lease status values into readable UI labels.
 */
function getLeaseStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "No Active Lease";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * TenantStatusBadge
 *
 * Compact status badge for lease-derived tenant state.
 *
 * Responsibilities:
 * - Display a readable lease status label.
 * - Apply consistent visual treatment for active vs unassigned states.
 *
 * Important:
 * - This is display-only.
 * - It reflects lease-derived status, not tenant-owned state.
 */
export default function TenantStatusBadge({ status }: Props) {
  const hasActiveLease = Boolean(status);
  const label = getLeaseStatusLabel(status);

  const className = hasActiveLease
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}