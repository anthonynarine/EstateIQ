// # Filename: src/org/orgApi.ts


import axiosClient from "../api/axios";

export type Org = {
  id: number;
  name: string;
  slug: string;
};

export type CreateOrgPayload = {
  name: string;
};

/**
 * listMyOrgs
 *
 * Fetch the organizations the current user belongs to.
 */
export async function listMyOrgs(): Promise<Org[]> {
  // Step 1: GET orgs (endpoint name may vary; update if yours differs)
  const res = await axiosClient.get("/api/v1/orgs/");
  return res.data;
}

/**
 * createOrg
 *
 * Create a new organization.
 */
export async function createOrg(payload: CreateOrgPayload): Promise<Org> {
  // Step 1: POST create org
  const res = await axiosClient.post("/api/v1/orgs/", payload);
  return res.data;
}
