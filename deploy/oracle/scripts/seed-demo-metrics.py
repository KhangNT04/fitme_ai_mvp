"""Generate SQL to reseed demo traffic / retention / wallets on a fresh FitMe DB.

Target: ~50 messy DAU, ~2 months of site_visits, ~120 consumer users with realistic emails,
activity days, Fitken wallets, and light try-on + analytics so admin pages look coherent.

Run on the VM after catalog seed is up:
  python3 seed-demo-metrics.py > /tmp/demo-metrics.sql
  docker exec -i fitme-postgres psql -U fitme -d fitme < /tmp/demo-metrics.sql
"""
from __future__ import annotations

import hashlib
import random
import secrets
import string
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SEED = 20261120
rng = random.Random(SEED)
TZ = ZoneInfo("Asia/Ho_Chi_Minh")
TODAY = date.today()
START = date(2026, 9, 15)

# Must match FITME_SEED_PASSWORD used on first boot (bcrypt cost 10 Spring-compatible).
# Placeholder replaced by wrapper script; default hash of a throwaway is invalid — set via env.
import os

BCRYPT_HASH = os.environ.get(
    "DEMO_BCRYPT_HASH",
    "",  # filled by caller
)

FIRST = [
    "An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Hương", "Khánh",
    "Lan", "Linh", "Minh", "Nam", "Ngọc", "Phúc", "Quân", "Sơn", "Trang", "Tuấn",
    "Uyên", "Vân", "Vy", "Yến", "Đức", "Thảo", "Nhung", "Khoa", "My", "Phương",
]
LAST = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
    "Bùi", "Đỗ", "Hồ", "Ngô", "Dương",
]
DOMAINS = (
    ["gmail.com"] * 55
    + ["yahoo.com"] * 12
    + ["outlook.com"] * 8
    + ["hotmail.com"] * 6
    + ["icloud.com"] * 5
    + ["mail.com"] * 3
    + ["ueh.edu.vn"] * 2
    + ["student.ctu.edu.vn"] * 2
)


def slug(s: str) -> str:
    table = str.maketrans(
        "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
        "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ",
        "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd"
        "AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD",
    )
    return s.translate(table).lower()


def email_for(first: str, last: str, i: int) -> str:
    f, l = slug(first), slug(last)
    styles = [
        f"{f}.{l}",
        f"{f}{l}",
        f"{f}{rng.randint(70, 99)}",
        f"{l}.{f}",
        f"{f[0]}.{l}",
        f"{f}.{rng.randint(1, 99)}",
        f"{l}{f}{rng.randint(1, 40)}",
    ]
    local = styles[i % len(styles)]
    local = "".join(ch for ch in local if ch.isalnum() or ch in "._")[:28]
    return f"{local}@{rng.choice(DOMAINS)}"


def visitors_for(day: date) -> int:
    """Messy ramp then ~50 ± noise; weekends slightly lower."""
    days = (day - START).days
    if days < 0:
        return 0
    if days < 20:
        base = 8 + days * 1.2
    elif days < 40:
        base = 32 + (days - 20) * 0.7
    else:
        base = 48
    noise = rng.gauss(0, 7)
    weekend = -6 if day.weekday() >= 5 else 0
    spike = 12 if rng.random() < 0.08 else (-10 if rng.random() < 0.06 else 0)
    return max(5, int(round(base + noise + weekend + spike)))


def main() -> None:
    if not BCRYPT_HASH.startswith("$2"):
        raise SystemExit("DEMO_BCRYPT_HASH must be a bcrypt hash (set by wrapper)")

    users = []
    used_emails = set()
    for i in range(120):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        em = email_for(first, last, i)
        n = 0
        while em in used_emails:
            n += 1
            em = email_for(first, last, i + n * 17)
        used_emails.add(em)
        # signup spread across window
        signup = START + timedelta(days=rng.randint(0, max(1, (TODAY - START).days - 3)))
        users.append(
            {
                "id": str(uuid.uuid4()),
                "email": em,
                "name": f"{last} {first}",
                "signup": signup,
            }
        )

    print("-- FitMe demo metrics (regenerated)")
    print("BEGIN;")
    print("-- keep seed demo accounts (admin/user/premium/brand); add consumers only")
    print(
        "DELETE FROM site_visits; "
        "DELETE FROM user_activity_days; "
        "DELETE FROM analytics_events WHERE event_type LIKE 'demo.%';"
    )

    # Users
    for u in users:
        created = datetime(u["signup"].year, u["signup"].month, u["signup"].day, rng.randint(8, 21), rng.randint(0, 59), tzinfo=TZ).astimezone(timezone.utc)
        print(
            "INSERT INTO user_accounts (id, email, password_hash, display_name, role, email_verified, status, created_at, updated_at) "
            f"VALUES ('{u['id']}'::uuid, '{u['email']}', '{BCRYPT_HASH}', $${u['name']}$$, 'USER', TRUE, 'ACTIVE', "
            f"'{created.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp, "
            f"'{created.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp) "
            "ON CONFLICT (email) DO NOTHING;"
        )

    # Wallets for all USER rows that lack one (bonus Fitken only)
    print(
        "INSERT INTO fitken_wallets (user_id, subscription_remaining, bonus_remaining, created_at, updated_at) "
        "SELECT u.id, 0, (5 + (random()*40)::int), NOW(), NOW() "
        "FROM user_accounts u "
        "WHERE u.role = 'USER' AND u.status = 'ACTIVE' "
        "AND NOT EXISTS (SELECT 1 FROM fitken_wallets w WHERE w.user_id = u.id);"
    )

    # Activity: signup day + random return days
    for u in users:
        print(
            f"INSERT INTO user_activity_days (user_id, activity_date) VALUES ('{u['id']}'::uuid, '{u['signup']}') "
            "ON CONFLICT DO NOTHING;"
        )
        span = (TODAY - u["signup"]).days
        if span <= 0:
            continue
        returns = rng.randint(2, min(18, span + 1))
        for _ in range(returns):
            d = u["signup"] + timedelta(days=rng.randint(0, span))
            print(
                f"INSERT INTO user_activity_days (user_id, activity_date) VALUES ('{u['id']}'::uuid, '{d}') "
                "ON CONFLICT DO NOTHING;"
            )

    # Also activity for built-in seed users
    print(
        "INSERT INTO user_activity_days (user_id, activity_date) "
        "SELECT u.id, (u.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date "
        "FROM user_accounts u WHERE u.role = 'USER' ON CONFLICT DO NOTHING;"
    )

    # Site visits
    day = START
    while day <= TODAY:
        n = visitors_for(day)
        for i in range(n):
            vid = str(uuid.uuid4())
            # ~55% of visits linked to a logged-in user that is "active" that day conceptually
            uid = "NULL"
            if rng.random() < 0.45 and users:
                # bias toward users who already signed up
                eligible = [u for u in users if u["signup"] <= day]
                if eligible and rng.random() < 0.7:
                    pick = rng.choice(eligible)
                    uid = f"'{pick['id']}'::uuid"
            views = max(1, int(rng.lognormvariate(0.8, 0.6)))
            views = min(views, 28)
            hour = rng.randint(7, 22)
            minute = rng.randint(0, 59)
            first = datetime(day.year, day.month, day.day, hour, minute, tzinfo=TZ).astimezone(timezone.utc)
            last = first + timedelta(minutes=rng.randint(2, 90))
            print(
                "INSERT INTO site_visits (visit_date, visitor_id, user_id, page_views, first_seen_at, last_seen_at) "
                f"VALUES ('{day}', '{vid}'::uuid, {uid}, {views}, "
                f"'{first.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp, "
                f"'{last.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp) "
                "ON CONFLICT DO NOTHING;"
            )
        day += timedelta(days=1)

    # ~55% of users "used AI" — lightweight try_on_requests COMPLETED without photos
    ai_users = [u for u in users if rng.random() < 0.55]
    for u in ai_users:
        when = u["signup"] + timedelta(days=rng.randint(0, max(0, (TODAY - u["signup"]).days)))
        ts = datetime(when.year, when.month, when.day, rng.randint(10, 21), rng.randint(0, 59), tzinfo=TZ).astimezone(timezone.utc)
        tid = str(uuid.uuid4())
        print(
            "INSERT INTO try_on_requests (id, user_id, status, created_at, updated_at) "
            f"VALUES ('{tid}'::uuid, '{u['id']}'::uuid, 'COMPLETED', "
            f"'{ts.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp, "
            f"'{ts.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp);"
        )
        print(
            "INSERT INTO analytics_events (id, event_type, user_id, try_on_request_id, created_at) "
            f"VALUES (gen_random_uuid(), 'demo.try_on', '{u['id']}'::uuid, '{tid}'::uuid, "
            f"'{ts.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp);"
        )

    print("COMMIT;")
    print(
        "SELECT (SELECT COUNT(*) FROM user_accounts WHERE role='USER') AS users, "
        "(SELECT COUNT(*) FROM site_visits) AS visits, "
        "(SELECT COUNT(*) FROM user_activity_days) AS activity, "
        "(SELECT COUNT(*) FROM fitken_wallets) AS wallets, "
        "(SELECT COUNT(*) FROM products WHERE status='ACTIVE') AS products;"
    )


if __name__ == "__main__":
    main()
