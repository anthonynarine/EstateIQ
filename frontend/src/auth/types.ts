// # Filename: src/auth/types.ts

export type OrgRole =
  | "owner"
  | "admin"
  | "manager"
  | "accountant"
  | "read_only";

export type Membership = {
  org_id?: string;
  org_name?: string;
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

export type AuthState = {
  user: User | null;
  memberships: Membership[];
  isAuthenticated: boolean;
  isHydrating: boolean;
};

export type AuthContextValue = {
  user: User | null;
  memberships: Membership[];
  isAuthenticated: boolean;
  isHydrating: boolean;

  login: (email: string, password: string) => Promise<MeResponse>;
  register: (payload: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<MeResponse>;
  logout: () => void;

  /**
   * Manually re-hydrate the session (rarely needed; useful after token changes).
   */
  hydrate: () => Promise<void>;
};