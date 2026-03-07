// # Filename: src/features/tenants/components/shared/TenantContactRow.tsx


type Props = {
  value: string | null | undefined;
  fallback?: string;
};

/**
 * formatContactValue
 *
 * Normalizes optional contact values for display.
 */
function formatContactValue(
  value: string | null | undefined,
  fallback: string
): string {
  return value?.trim() || fallback;
}

/**
 * TenantContactRow
 *
 * Small presentational row for tenant contact information.
 *
 * Responsibilities:
 * - Render a consistent value row.
 * - Gracefully handle missing values.
 * - Support dense, mobile-friendly card layouts.
 */
export default function TenantContactRow({
  value,
  fallback = "Not provided",
}: Props) {
  return (
    <p className="min-w-0 break-words text-sm text-neutral-300">
      {formatContactValue(value, fallback)}
    </p>
  );
}