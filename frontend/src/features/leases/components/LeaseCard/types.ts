// # Filename: src/features/leases/components/LeaseCard/types.ts


import type { Lease, LeaseStatus } from "../../api/types";

/**
 * Base props for the lease card surface.
 */
export interface LeaseCardProps {
  lease: Lease;
  orgSlug: string;
  unitId: number;
  compact?: boolean;
  showDbId?: boolean;
  displayLabel?: string;
}

/**
 * Shared view model for primary-tenant display on the lease card.
 */
export interface LeaseCardTenantViewModel {
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  missingPrimaryTenant: boolean;
  leaseStatus: LeaseStatus;
}