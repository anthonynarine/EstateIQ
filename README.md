# EstateIQ (PortfolioOS)

EstateIQ is the frontend + backend workspace for **PortfolioOS** — a production-grade, multi-tenant SaaS for small real estate portfolio owners (1–50 units).

Key idea: **ledger-first + org-scoped data** with a deterministic financial engine.

---

## Repo Structure

```txt
ESTATEIQ/
  backend/     # Django + DRF (API, multi-tenant org scoping)
  frontend/    # Vite + React + TypeScript + Tailwind (web app)
  docs/        # Architecture, security, API contracts, etc.
  README.md
  .gitignore
