// # Filename: src/features/leases/forms/CreateLeaseForm/CreateLeaseCollapse.tsx


import type { ReactNode } from "react";
import Collapse from "../../../../components/ui/Collapse";

type Props = {
  isOpen: boolean;
  children: ReactNode;
};

/**
 * CreateLeaseCollapse
 *
 * Lease-form-specific wrapper around the shared Collapse primitive.
 */
export default function CreateLeaseCollapse({
  isOpen,
  children,
}: Props) {
  return (
    <Collapse
      isOpen={isOpen}
      durationMs={360}
      className="w-full"
      contentClassName="pt-4 sm:pt-5"
    >
      {children}
    </Collapse>
  );
}