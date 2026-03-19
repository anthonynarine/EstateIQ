// # Filename: src/features/expenses/pages/components/ExpensesContent.tsx

import type { ReactNode } from "react";

interface ExpensesContentProps {
  formSection: ReactNode;
  tableSection: ReactNode;
}

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