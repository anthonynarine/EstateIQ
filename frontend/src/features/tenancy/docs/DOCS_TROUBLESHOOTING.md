# Troubleshooting — Tenancy + Leases Slice

## 403 Forbidden
- Likely missing/empty X-Org-Slug or user not in org.

## 401 Unauthorized
- Access token expired and refresh failed.

## 400 on POST /leases/
- Payload mismatch (unit missing, invalid date, parties shape).

## 404 on /units/:id/leases/
- Backend route missing or unit id invalid.
