// # Filename: src/features/expenses/pages/components/ExpensesContent.tsx
// ✅ New Code

import type { ReactNode } from "react";

interface ExpensesContentProps {
  formSection: ReactNode;
  tableSection: ReactNode;
}

/**
 * Layout shell for the Expenses page.
 *
 * Both desktop columns should stretch together so the
 * form shell and records shell align visually.
 */
export default function ExpensesContent({
  formSection,
  tableSection,
}: ExpensesContentProps) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-stretch">
      <div className="min-h-0 h-full">{formSection}</div>
      <div className="min-w-0 h-full">{tableSection}</div>
    </section>
  );
}