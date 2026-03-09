
<p align="center">
  <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80" alt="EstateIQ Banner" width="100%">
</p>

<h1 align="center">EstateIQ (PortfolioOS)</h1>

<p align="center">
AI‑Native Financial Operating System for Small Real Estate Portfolios
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react">
  <img src="https://img.shields.io/badge/Backend-Django-green?style=for-the-badge&logo=django">
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&logo=postgresql">
  <img src="https://img.shields.io/badge/Auth-JWT-orange?style=for-the-badge">
</p>

---

# Vision

EstateIQ is not a rent tracker.

It is a **ledger‑first, multi‑tenant financial operating system** for landlords managing **1–50 units**.

The platform focuses on:

• Deterministic financial logic  
• Strict tenant isolation (multi‑tenant SaaS design)  
• Structured financial data for analytics and AI interpretation  
• Clear financial visibility across real estate portfolios  

The goal is to give **small landlords the clarity that enterprise real estate systems provide to institutional investors**.

---

# Author

**Anthony Narine**  
Full‑Stack Software Engineer

EstateIQ is a **solo-built full-stack application** created by Anthony Narine.

The project was originally built to help **Anthony’s mother manage her rental property business more easily**.

While researching existing software it became clear that:

• Most property management software is **built for large apartment operators**  
• Many platforms are **expensive for small landlords**  
• Existing tools prioritize **rent collection over financial clarity**

EstateIQ was designed to solve these problems by providing a **clear financial operating system for small real estate portfolios**.

This project serves both as:

• A **real operational tool for a family rental business**  
• A **production-grade portfolio application demonstrating modern SaaS architecture**

---

# Key Features

• Multi‑tenant SaaS architecture  
• Organization‑scoped real estate portfolios  
• Buildings → Units → Leases → Tenants domain model  
• Ledger‑first financial accounting system  
• Charge and payment allocation tracking  
• Tenant lifecycle and lease management  
• Role-based organization membership  
• Financial insight readiness for AI analysis  

---

# Application Screenshots

*(Replace with screenshots from your app)*

## Dashboard
![Dashboard Placeholder](https://via.placeholder.com/1200x600?text=EstateIQ+Dashboard)

## Buildings & Units
![Buildings Placeholder](https://via.placeholder.com/1200x600?text=Buildings+and+Units)

## Lease Management
![Lease Placeholder](https://via.placeholder.com/1200x600?text=Lease+Management)

---

# Tech Stack

### Frontend

• React  
• TypeScript  
• TanStack Query  
• TailwindCSS  

### Backend

• Django  
• Django REST Framework  
• Service Layer Architecture  

### Database

• PostgreSQL

### Authentication & Security

• JWT Authentication  
• **JWT stored in secure HTTP‑only cookies in production**  
• Organization membership validation  
• Org-scoped requests using `X-Org-Slug` header  
• Strict tenant isolation across the database  

---

# Domain Modeling

EstateIQ follows **domain-driven design principles**.

The data model mirrors how real property portfolios operate.

```
Organization
   └── Building
        └── Unit
             └── Lease
                  └── Tenant
```

Core modeling principles:

• **Organization** represents the SaaS tenant boundary  
• **Buildings belong to organizations**  
• **Buildings contain multiple units**  
• **Units may have multiple leases over time**  
• **Tenants participate in leases but do not own the lease record**

The **Lease** entity acts as the core financial contract connecting:

• Tenant  
• Unit  
• Rent amount  
• Lease dates  
• Financial charges  

This mirrors real-world landlord workflows.

---

# Multi‑Tenant Architecture

EstateIQ allows multiple landlord businesses to operate inside the same system while keeping all data isolated.

Example request flow:

```
React Frontend
      ↓
Authorization: Bearer <token>
X-Org-Slug: fazie-inc
      ↓
Django Middleware resolves request.org
      ↓
Database queries filtered by organization_id
      ↓
Org-scoped data returned
```

This ensures **complete data isolation between landlord organizations**.

---

# Ledger‑First Financial Model

EstateIQ is **ledger-first**.

Financial data is generated through deterministic entries rather than inferred calculations.

```
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

This structure allows:

• Accurate receivable tracking  
• Transparent payment allocation  
• AI-readable financial records  

---

# System Architecture

```
React + TypeScript
        ↓
TanStack Query
        ↓
Django REST API
        ↓
Service Layer
        ↓
PostgreSQL
```

EstateIQ uses a **modular monolith architecture** to balance simplicity and scalability.

---

# Security Model

Security is designed around strict multi‑tenant isolation.

Features include:

• JWT authentication  
• **JWT stored in HTTP‑only cookies in production**  
• Organization membership validation  
• Organization‑scoped database queries  
• Role-based access control  

No cross‑tenant data access is possible.

---

# Development Principles

• Modular Django apps  
• Service-layer business logic  
• Deterministic financial modeling  
• Strict domain separation  
• Predictable API contracts  
• Org‑scoped TanStack query keys  

---

# Roadmap

### Phase 1 — Deterministic Intelligence

• Portfolio dashboard  
• Delinquency reports  
• Rent posting automation  

### Phase 2 — AI Simulation

• Rent increase modeling  
• Vacancy stress scenarios  
• Building performance analysis  

### Phase 3 — Predictive Intelligence

• Delinquency prediction  
• Expense anomaly detection  
• Portfolio optimization insights  

---

# Why This Project Matters

EstateIQ demonstrates the ability to build **real SaaS software for real-world business problems**.

The system showcases:

• Multi‑tenant SaaS architecture  
• Domain‑driven design  
• Modern full‑stack development  
• Financial data modeling  
• Secure authentication practices  

---

<p align="center">
EstateIQ is being developed as a production-grade SaaS platform for small real estate portfolios.
</p>
