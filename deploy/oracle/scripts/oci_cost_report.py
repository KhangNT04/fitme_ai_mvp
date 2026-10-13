"""Cost report for the tenancy: month-to-date by service, last 30 days daily total, and budgets."""
import datetime as dt
import sys

import oci

sys.stdout.reconfigure(encoding="utf-8")
config = oci.config.from_file()
tenancy = config["tenancy"]
usage = oci.usage_api.UsageapiClient(config)
budget = oci.budget.BudgetClient(config)

now = dt.datetime.now(dt.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
tomorrow = now + dt.timedelta(days=1)
month_start = now.replace(day=1)


def summarize(start, end, granularity, group_by):
    return usage.request_summarized_usages(oci.usage_api.models.RequestSummarizedUsagesDetails(
        tenant_id=tenancy, time_usage_started=start, time_usage_ended=end,
        granularity=granularity, query_type="COST", group_by=group_by)).data.items


by_service = summarize(month_start, tomorrow, "MONTHLY", ["service"])
currency = next((i.currency for i in by_service if i.currency), "USD")
total = sum((i.computed_amount or 0) for i in by_service)
print(f"CURRENCY {currency}")
print(f"MONTH_TO_DATE {total:.4f}")
for i in sorted(by_service, key=lambda x: -(x.computed_amount or 0)):
    if (i.computed_amount or 0) or (i.computed_quantity or 0):
        print(f"SERVICE {i.service}|{(i.computed_amount or 0):.4f}")

daily = summarize(now - dt.timedelta(days=30), tomorrow, "DAILY", [])
for i in sorted(daily, key=lambda x: x.time_usage_started):
    print(f"DAY {i.time_usage_started:%Y-%m-%d}|{(i.computed_amount or 0):.4f}")

for b in budget.list_budgets(tenancy, target_type="ALL").data:
    print(f"BUDGET {b.display_name}|{b.amount}|{b.reset_period}|actual={b.actual_spend}|forecast={b.forecasted_spend}")
    for r in budget.list_alert_rules(b.id).data:
        print(f"  RULE {r.display_name}|{r.type}|{r.threshold}{'%' if r.threshold_type == 'PERCENTAGE' else ''}|{r.recipients}")
