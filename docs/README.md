# EstateIQ Documentation

EstateIQ is a **financial operating system for small real estate portfolios (1–50 units)**.
This documentation set is organized so product truth, system truth, domain truth, API contracts,
operations, security, and design decisions do not collapse into one markdown junk drawer.

## Docs map

- [`product/`](./product/README.md) — ICP, jobs-to-be-done, roadmap, and positioning
- [`architecture/`](./architecture/README.md) — system-wide architecture and rich diagrams
- [`api/`](./api/README.md) — endpoint map, response conventions, and contract notes
- [`development/`](./development/README.md) — local setup, contribution workflow, and repo habits
- [`operations/`](./operations/README.md) — deployment, release, observability, and runtime notes
- [`security/`](./security/README.md) — threat model, controls, and secure file handling
- [`decisions/`](./decisions/README.md) — ADRs for architectural commitments
- [`references/`](./references/README.md) — glossary and supporting reference material

## How to use this docs set

1. Start with [`product/README.md`](./product/README.md) to understand who the system is for.
2. Read [`architecture/README.md`](./architecture/README.md) to understand how the system is shaped.
3. Go into [`architecture/domains/`](./architecture/domains/README.md) to study a bounded context.
4. Use [`api/`](./api/README.md) when wiring frontend and backend.
5. Use [`decisions/`](./decisions/README.md) when you need the “why,” not just the “what.”

## Documentation rules

- One page should explain one main idea.
- Each diagram should have a plain-English explanation.
- Domain ownership must be explicit.
- Organization scoping should be shown any time data crosses boundaries.
- Product intent belongs in `product/`, not mixed into system internals.
- Architectural commitments belong in ADRs so the repo remembers why choices were made.
