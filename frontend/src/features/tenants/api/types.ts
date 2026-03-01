// # Filename: src/features/tenants/api/types.ts
/**
 * Tenant domain types (frontend)
 *
 * Why this file exists:
 * - Centralizes TypeScript types for the Tenants feature.
 * - Keeps API payload shapes consistent across hooks/components.
 * - Makes it easy to refactor without touching UI code everywhere.
 *
 * Notes:
 * - `email`/`phone` can be null because users may not provide them.
 * - Timestamps are ISO strings returned by the Django API.
 */

export type Tenant = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * CreateTenantInput
 *
 * Payload used when creating a new tenant.
 * Mirrors the backend serializer fields (except server-owned fields).
 */
export type CreateTenantInput = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * UpdateTenantInput
 *
 * PATCH payload used to partially update a tenant.
 * Uses Partial to enforce PATCH semantics (only send what changed).
 */
export type UpdateTenantInput = Partial<CreateTenantInput>;