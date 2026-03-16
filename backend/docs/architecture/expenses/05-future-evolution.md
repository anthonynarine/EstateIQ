# 05 — Future Evolution

## Why This Page Exists

The Expenses module is already useful, but the architecture should make future growth easier rather than harder.

This page describes the most natural next steps without collapsing the module’s boundaries.

---

## Near-Term Evolution

### 1. Reporting Tests
Now that reporting has its own surface, it needs:

- selector aggregation tests
- endpoint tests
- org isolation tests
- archived-expense default behavior tests
- `top_n` behavior tests

### 2. Audit Trail
Sensitive mutations should eventually emit audit entries for actions like:

- create expense
- update expense
- archive expense
- unarchive expense
- attachment add/remove

### 3. Export Support
Likely first exports:
- CSV
- accountant review exports
- period-specific expense dumps
- building-level expense exports

### 4. Building Detail Reporting
Expenses should eventually feed richer building-level cards such as:

- current-month spend
- trailing 3-month spend
- largest categories for the building
- vendor concentration for the building

---

## Mid-Term Evolution

### 1. Vendor Analytics
Natural growth areas:
- spend by vendor
- recurring vendors
- high-cost vendor concentration
- vendor history by building
- service category by vendor

### 2. Reimbursement Workflows
Once reimbursement logic matures, the system could support:

- reimbursement pipelines
- reimbursement aging
- reimbursable vs non-reimbursable analysis
- lease-contextual reimbursement state

### 3. Attachment Intelligence
Supporting-document growth could include:
- preview support
- OCR extraction
- invoice metadata extraction
- attachment validation workflows

### 4. Cross-Domain Reporting
Expenses will likely become one major ingredient in broader finance views that also involve:

- rent charges
- rent collections
- mortgage obligations
- utility patterns
- property profitability views

That broader composition should happen in a higher-level reporting or finance surface, not by turning Expenses into the entire accounting system.

---

## Long-Term Evolution

### 1. Spend Anomaly Detection
Examples:
- unusual spikes in a building
- abnormal unit-level repair frequency
- category drift over time
- vendor spend concentration changes

### 2. AI Explanation Layer
AI should sit on top of deterministic reporting outputs, not replace them.

Examples:
- “Utilities are 24% higher than last quarter.”
- “Building B2 is carrying the highest maintenance burden.”
- “Repairs became the dominant category in February.”

### 3. Executive Summaries
The system could produce:
- monthly portfolio operating summaries
- building-by-building cost briefs
- expense risk callouts
- maintenance trend snapshots

### 4. Tax Packet / Year-End Assembly
Potential future features:
- annual expense packet generation
- accountant handoff bundle
- category totals for tax review
- supporting-document bundling

---

## Architecture Guardrails for Future Growth

As the module evolves, keep these guardrails:

1. Views stay thin.
2. Raw aggregation stays in selectors.
3. Business rules stay in services.
4. Reporting contracts stay explicit.
5. Cross-domain composition happens deliberately, not accidentally.
6. Multi-tenant org boundaries remain non-negotiable.
7. AI must remain grounded in structured data.

---

## Final Thought

The strongest version of the Expenses domain is not the one with the most features.

It is the one that:
- captures high-quality cost data
- enforces strict structure
- exposes deterministic reporting
- scales naturally into richer financial intelligence
