// src/features/leases/forms/TenantSection/tenantTypes.ts
export type TenantMode = "select" | "create";
export type TenantCreateDraft = { full_name: string; email: string; phone: string };
export type TenantFieldErrors = Partial<Record<keyof TenantCreateDraft, string[]>>;