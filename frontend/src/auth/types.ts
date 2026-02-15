// # Filename: src/auth/types.ts


export type OrgRole = "owner" | "admin" | "manager" | "accountant" | "read_only";

export type Membership = {
  org_slug: string;
  role: OrgRole;
};

export type User = {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type MeResponse = {
  user: User;
  memberships: Membership[];
};
