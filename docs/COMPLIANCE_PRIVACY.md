# Privacy & Compliance — PortfolioOS

Date: 2026-02-13

PortfolioOS processes personal data (tenants) and financial data (payments/expenses). This document defines safe handling standards.

---

## Data minimization

Only store what is needed to operate:
- tenant name + contact
- lease terms
- payment/expense records

Avoid:
- SSNs
- full bank account details
- unnecessary IDs

---

## Data retention

- Receipts/leases: keep as long as customer requires
- Soft-delete records where possible; keep ledger immutable
- Provide export and deletion workflows (Phase 2)

---

## Access controls

- Role-based access
- Organization isolation
- “Read-only” mode for accountants

---

## Encryption

- TLS for data in transit
- encrypt disks or use managed DB encryption at rest

---

## GDPR/CCPA readiness (if needed later)

- Export user data
- Delete or anonymize tenant data (where lawful)
- Consent and privacy policy updates
