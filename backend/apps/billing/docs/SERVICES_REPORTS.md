# Reporting Services

## DelinquencyService

Computes A/R aging buckets:
- 0–30
- 31–60
- 61–90
- 90+

Derived from unpaid balances as_of date.

---

## OrgDashboardService

Computes KPIs:
- expected_rent_this_month
- collected_this_month
- outstanding_as_of
- delinquent_leases_count
- unapplied_credits_total

All computed, never stored.
