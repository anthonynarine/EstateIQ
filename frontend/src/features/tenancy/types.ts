// # Filename: src/features/tenancy/types.ts

/**
 * Tenancy Domain Types
 *
 * These types reflect the DRF contracts for:
 * - Tenants
 * - Leases
 * - Lease parties (write vs read shapes)
 *
 * Goal:
 * - Keep API modules and UI strongly typed
 * - Prevent accidental contract drift
 */

 export type ID = number;
 export type ISODate = string; // e.g. "2026-02-18"
 export type MoneyString = string; // DRF decimals usually come as strings (e.g. "2500.00")
 
 /**
  * Standard DRF pagination envelope.
  */
 export type PaginatedResponse<T> = {
   count: number;
   next: string | null;
   previous: string | null;
   results: T[];
 };
 
 /**
  * Tenant
  *
  * Backend contract (expected):
  * - id, full_name
  * - optional: email, phone
  * - may include created_at/updated_at depending on serializer
  */
 export type Tenant = {
   id: ID;
   full_name: string;
   email?: string | null;
   phone?: string | null;
 
   // Optional fields if your backend serializer includes them:
   created_at?: string;
   updated_at?: string;
 };
 
 /**
  * Tenant create payload (POST /api/v1/tenants/)
  */
 export type CreateTenantPayload = {
   full_name: string;
   email?: string | null;
   phone?: string | null;
 };
 
 /**
  * Lease status options (as per your backend contract).
  */
 export type LeaseStatus = "draft" | "active" | "ended";
 
 /**
  * Lease party roles (MVP uses only "primary").
  * Add more roles later if backend supports them.
  */
 export type LeasePartyRole = "primary" | "co_tenant";
 
 /**
  * Write-only party input (POST/PATCH lease)
  * Backend expects tenant as an ID, not nested object.
  */
 export type LeasePartyWrite = {
   tenant: ID;
   role: LeasePartyRole;
 };
 
 /**
  * Read-only party detail (GET lease)
  * Backend returns nested tenant object.
  */
 export type LeasePartyDetail = {
   tenant: Tenant;
   role: LeasePartyRole;
 };
 
 /**
  * Lease
  *
  * Read shape includes parties_detail:
  * - parties_detail: [{ tenant: {..}, role }]
  *
  * Note:
  * - money fields typically arrive as decimal strings from DRF.
  */
 export type Lease = {
   id: ID;
   unit: ID;
 
   start_date: ISODate;
   end_date?: ISODate | null;
 
   rent_amount: MoneyString;
   status: LeaseStatus;
 
   rent_due_day?: number | null;
   security_deposit_amount?: MoneyString | null;
 
   parties_detail?: LeasePartyDetail[];
 
   // Optional fields if your backend serializer includes them:
   created_at?: string;
   updated_at?: string;
 };
 
 /**
  * Create lease payload (POST /api/v1/leases/)
  *
  * Matches the write contract:
  * - unit is an ID
  * - parties is write-only list of IDs + role
  */
 export type CreateLeasePayload = {
   unit: ID;
   start_date: ISODate;
   end_date?: ISODate | null;
 
   rent_amount: MoneyString;
   status: LeaseStatus;
 
   rent_due_day?: number | null;
   security_deposit_amount?: MoneyString | null;
 
   parties: LeasePartyWrite[];
 };
 
 export type Unit = {
  id: number;
  name?: string | null;
  unit_number?: string | null;
  building?: number | null;
  floor?: string | number | null;
};