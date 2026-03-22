// # Filename: src/features/expenses/pages/components/ExpensesContent.tsx

import type { ReactNode } from "react";

interface ExpensesContentProps {
  formSection: ReactNode;
  tableSection: ReactNode;
}

/**
 * Two-column layout shell for the Expenses page.
 *
 * Responsibilities:
 * - keep the form and records table visually separated
 * - provide a responsive single-column fallback on smaller screens
 * - keep the form section sticky on larger screens during record review
 *
 * This component is intentionally layout-only.
 * It should not own any data fetching, mutation logic, or page state.
 *
 * @param props Render props for the form and table regions.
 * @returns Responsive page content layout for the Expenses slice.
 */
export default function ExpensesContent({
  formSection,
  tableSection,
}: ExpensesContentProps) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
      <div className="xl:sticky xl:top-6">{formSection}</div>
      <div className="min-w-0">{tableSection}</div>
    </section>
  );
}