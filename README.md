
<p align="center">
  <img src="docs/assets/estateiq-hero.png" width="100%" alt="EstateIQ Hero"/>
</p>

<h1 align="center">🌌 EstateIQ</h1>

<p align="center">
<b>Financial Operating System for Small Real Estate Portfolios</b>
</p>

<p align="center">
Built by <b>Anthony Narine</b> • Solo Full-Stack Developer
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-61dafb?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/Backend-Django-092e20?style=for-the-badge&logo=django"/>
  <img src="https://img.shields.io/badge/Language-TypeScript-3178c6?style=for-the-badge&logo=typescript"/>
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql"/>
  <img src="https://img.shields.io/badge/Auth-JWT-orange?style=for-the-badge"/>
</p>

---

## ✨ Vision

EstateIQ is **not a rent tracker**.

It is a **ledger-first financial operating system** designed for landlords managing **1–50 units**.

Most property software focuses on collecting rent.

EstateIQ focuses on **financial clarity**.

The platform is designed around:

- deterministic financial records
- strict multi-tenant data isolation
- domain-driven architecture
- structured financial data ready for analytics and AI

> Give small landlords the financial visibility institutional investors already have.

---

## 🪐 At a Glance

- **Built by:** Anthony Narine
- **Built for:** a real family rental business
- **Architecture:** multi-tenant SaaS
- **Core model:** organization → building → unit → lease → tenant
- **Security:** JWT with secure HTTP-only cookies in production
- **Purpose:** give small landlords a real financial operating system, not just rent collection tools

---

## 🌐 System Diagram

```text
┌───────────────┐
│ React + TS UI │
└───────┬───────┘
        │
        ▼
┌───────────────────┐
│ TanStack Query    │
│ Axios API Client  │
└───────┬───────────┘
        │
        ▼
┌───────────────────────────────┐
│ Django REST API               │
│ Auth + Org Resolution         │
│ Permission + Service Layer    │
└───────┬───────────────────────┘
        │
        ▼
┌───────────────────┐
│ PostgreSQL        │
│ Org-Scoped Data   │
└───────────────────┘
```

---

## 🧭 Domain Architecture

```text
Organization
   ├── Members
   ├── Buildings
   │    └── Units
   │         └── Leases
   │              └── Tenants
   └── Financial Activity
        ├── Charges
        ├── Payments
        └── Allocations
```

The **lease** is the core business contract because it connects:

- tenant
- unit
- rent amount
- lease dates
- financial charges

That mirrors the real-world workflow of property management.

---

## 👨‍💻 Author

**Anthony Narine**  
Full-Stack Software Engineer

EstateIQ is a **solo-built system** created by Anthony Narine.

The project was originally built to help **Anthony’s mother manage her rental business more easily**.

During research it became clear that:

- most property management tools target **large apartment operators**
- small landlords are often **priced out of good software**
- existing tools prioritize **rent collection over financial insight**

EstateIQ was designed to solve those problems by creating a **clear financial operating system for small portfolios**.

This project serves both as:

- a real operational tool for a family business
- a production-grade portfolio project demonstrating SaaS architecture

---

## 🧠 Core Idea

EstateIQ treats a real estate portfolio like a **financial system**, not a spreadsheet.

Instead of loosely tracking data, the platform creates a **deterministic ledger of financial activity**.

This enables:

- transparent payment allocation
- accurate receivable tracking
- reliable financial reporting
- AI-readable financial history

---

## 🏢 Domain Model

EstateIQ follows **domain-driven design**.

```text
Organization
   └── Building
        └── Unit
             └── Lease
                  └── Tenant
```

### Modeling Principles

**Organization**  
Represents the SaaS tenant boundary.

**Buildings**  
Physical properties owned by the organization.

**Units**  
Individual rentable spaces.

**Leases**  
Financial contracts connecting tenants and units.

**Tenants**  
People renting units.

---

## 🌐 Multi-Tenant Architecture

EstateIQ is built as a **multi-tenant SaaS system**.

Each landlord business operates within its own **organization boundary**.

```text
React Frontend
       ↓
JWT Authentication
       ↓
X-Org-Slug Header
       ↓
Django Middleware resolves organization
       ↓
Database queries filtered by organization_id
```

This guarantees:

- strict tenant isolation
- secure data boundaries
- scalable SaaS architecture

---

## 📊 Ledger-First Financial Model

EstateIQ uses a **deterministic financial ledger**.

Nothing is inferred without entries.

```text
Rent Posting
     ↓
Charge
     ↓
Ledger Entry
     ↓
Payment
     ↓
Allocation
     ↓
Reports
```

Benefits:

- transparent financial history
- consistent reporting
- AI-ready structured data

---

## 🔐 Security Model

Security is designed around strict multi-tenant isolation.

Features include:

- JWT authentication
- **JWT stored in secure HTTP-only cookies in production**
- organization membership validation
- organization-scoped queries
- role-based access control

No cross-tenant data access is possible.

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- TanStack Query
- TailwindCSS

### Backend
- Django
- Django REST Framework
- Service Layer Architecture

### Database
- PostgreSQL

---

## 🖥 Application Screenshots

Add your real screenshots here:

```text
docs/screenshots/dashboard.png
docs/screenshots/buildings.png
docs/screenshots/leases.png
```

Recommended layout:

```markdown
### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Buildings & Units
![Buildings](docs/screenshots/buildings.png)

### Lease Management
![Leases](docs/screenshots/leases.png)
```

---

## 🚀 Roadmap

### Phase 1 — Deterministic Intelligence
- portfolio dashboard
- delinquency reporting
- rent posting automation

### Phase 2 — AI Simulation
- rent increase modeling
- vacancy stress scenarios
- building performance analysis

### Phase 3 — Predictive Intelligence
- delinquency prediction
- expense anomaly detection
- portfolio optimization insights

---

## ⭐ Why This Project Matters

EstateIQ demonstrates the ability to build **real SaaS software solving real-world business problems**.

The project showcases:

- multi-tenant SaaS architecture
- domain-driven design
- modern full-stack engineering
- financial system modeling
- secure authentication practices

---

<p align="center">
Built with care by Anthony Narine
</p>
