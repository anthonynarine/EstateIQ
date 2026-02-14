# Roadmap (90 Days) — PortfolioOS

Date: 2026-02-13

This roadmap focuses on shipping a sellable MVP.

---

## Weeks 1–2: Foundation
- Repo scaffold, Docker local deps
- Organization + roles + invite users
- Auth end-to-end
- Audit log framework

Exit:
- login works
- user sees only org data
- role gating works

---

## Weeks 3–4: Properties
- Buildings CRUD
- Units CRUD
- Bulk unit creation wizard
- Building overview UI

Exit:
- add 30 units under 1 minute

---

## Weeks 5–6: Leasing
- Tenants CRUD
- Leases CRUD
- End lease action
- Occupancy derived from leases
- Unit history view

Exit:
- occupancy history is correct

---

## Weeks 7–8: Billing / Ledger
- Charges (rent)
- Payments
- Allocations
- Lease ledger view
- Delinquency report (as-of)

Exit:
- “who owes what?” is correct and test-covered

---

## Weeks 9–10: Expenses
- Expense entry + categories
- Receipt upload
- Building expense views
- Monthly totals

Exit:
- monthly cash flow components available

---

## Weeks 11–12: Reporting + polish
- Portfolio dashboard
- Cash flow report per building and portfolio
- Year-end export CSV
- Onboarding polish

Exit:
- answers “Am I making money?” in one screen

---

## After MVP (Phase 2)
- Scenario simulator
- Executive monthly report PDF
- Reminders and automations
- Stripe/Plaid integrations
- AI explanations over your own ledger data
