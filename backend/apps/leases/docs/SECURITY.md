# 03 — Security

## Enforcement Layers

1) **Middleware**
   - Reads `X-Org-Slug`
   - Attaches `request.org`

2) **Permissions**
   - `IsOrgMember` (shared) prevents non-members from accessing org resources

3) **Org-scoped selectors**
   - All list + detail querysets are filtered by `organization=request.org`

4) **Serializer validation**
   - Leases validate `unit.organization_id == request.org.id`

5) **Services**
   - Always set `organization` from `request.org`
   - Validate related objects are in same org before creating join rows

## Expected Failure Modes

- Cross-org read: **404**
- Cross-org update/delete: **404**
- Cross-org create where FK points to other org: **400** (field validation)

## Minimal PII

Tenant stores:

- name (required)
- email/phone optional

Avoid storing DOB, SSN, full addresses, etc., in this domain unless required.
