```{=html}
<p align="center">
```
`<img src="docs/assets/estateiq-hero.png" width="100%" alt="EstateIQ Hero"/>`{=html}
```{=html}
</p>
```
```{=html}
<h1 align="center">
```
EstateIQ
```{=html}
</h1>
```
```{=html}
<p align="center">
```
`<b>`{=html}Financial Operating System for Small Real Estate
Portfolios`</b>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
Built by `<b>`{=html}Anthony Narine`</b>`{=html} • Solo Full‑Stack
Developer
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<img src="https://img.shields.io/badge/React-Frontend-61dafb?style=flat-square&logo=react"/>`{=html}
`<img src="https://img.shields.io/badge/Django-Backend-092e20?style=flat-square&logo=django"/>`{=html}
`<img src="https://img.shields.io/badge/TypeScript-Language-3178c6?style=flat-square&logo=typescript"/>`{=html}
`<img src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql"/>`{=html}
`<img src="https://img.shields.io/badge/Auth-JWT-orange?style=flat-square"/>`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

# ✨ Vision

EstateIQ is **not a rent tracker**.

It is a **ledger‑first financial operating system** for landlords
managing **1--50 units**.

Most property software focuses on collecting rent.

EstateIQ focuses on **financial clarity**.

The goal is simple:

• Know exactly what you make\
• Know exactly what is owed\
• Know exactly what you spend

Institutional investors already have tools like this.

Small landlords usually don't.

------------------------------------------------------------------------

# 🖥 Application Preview

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

------------------------------------------------------------------------

### Buildings & Units

![Buildings](docs/screenshots/buildings.png)

------------------------------------------------------------------------

### Lease Management

![Leases](docs/screenshots/leases.png)

------------------------------------------------------------------------

# 🧠 Core Idea

EstateIQ treats a real estate portfolio like a **financial system**, not
a spreadsheet.

Instead of loosely tracking numbers, the platform creates a
**deterministic financial ledger**.

This enables:

• transparent rent accounting\
• accurate payment allocation\
• reliable financial reporting\
• structured data ready for analytics and AI

------------------------------------------------------------------------

# 🧭 Business Model

EstateIQ models the real-world structure of rental businesses.

    Organization
       └── Building
            └── Unit
                 └── Lease
                      └── Tenant

The **lease** is the core contract connecting:

• tenant\
• unit\
• rent amount\
• lease dates

This mirrors real property management workflows.

------------------------------------------------------------------------

# 🏗 System Architecture

    React + TypeScript UI
            │
            ▼
    TanStack Query + Axios
            │
            ▼
    Django REST API
    (Service Layer + Auth + Org Resolution)
            │
            ▼
    PostgreSQL
    (Organization‑scoped data)

Key architecture principles:

• multi‑tenant SaaS from day one\
• domain‑driven backend structure\
• service‑layer business logic\
• ledger‑first financial modeling

------------------------------------------------------------------------

# 🔐 Security Model

Security is built around strict organization isolation.

Features include:

• JWT authentication\
• Secure HTTP‑only cookies in production\
• organization‑scoped database queries\
• role‑based access control

Cross‑tenant data access is not possible.

------------------------------------------------------------------------

# 🛠 Tech Stack

### Frontend

-   React
-   TypeScript
-   TanStack Query
-   TailwindCSS

### Backend

-   Django
-   Django REST Framework
-   Service‑layer architecture

### Database

-   PostgreSQL

------------------------------------------------------------------------

# 🚀 Roadmap

### Phase 1 --- Core Platform

-   buildings and units
-   tenants and leases
-   rent ledger
-   expense tracking
-   portfolio dashboard

### Phase 2 --- Intelligence Layer

-   portfolio performance scoring
-   rent increase simulations
-   vacancy stress scenarios
-   automated financial summaries

### Phase 3 --- AI Copilot

-   financial insights
-   expense anomaly detection
-   portfolio optimization suggestions

------------------------------------------------------------------------

# 👨‍💻 Author

**Anthony Narine**\
Full‑Stack Software Engineer

EstateIQ was originally built to help **my mom manage her rental
business more easily**.

While building the system it became clear that:

• most property software targets large apartment operators\
• small landlords are priced out of good tools\
• existing platforms focus on rent collection instead of financial
clarity

EstateIQ was designed to solve that problem.

This project serves both as:

• a real operational tool for a family rental business\
• a production‑grade SaaS architecture demonstration

------------------------------------------------------------------------

```{=html}
<p align="center">
```
Built with care by Anthony Narine
```{=html}
</p>
```
