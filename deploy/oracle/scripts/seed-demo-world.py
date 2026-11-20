#!/usr/bin/env python3
"""Rebuild a coherent ~155-account FitMe demo world on Postgres.

Keeps: ADMIN + BRAND_OWNER + user@fitme.ai + premium@fitme.ai.
Wipes other USER rows, then inserts 142 consumers and linked activity:
  profiles, Fitken wallet+ledger, visits, try-ons+items, reviews, buy clicks,
  brand leads, community posts/likes/comments/saves/follows.

Usage on the VM (after catalog is live):
  docker compose ... exec -T postgres psql -U fitme -d fitme -At -F',' \\
    -c "SELECT p.id, p.brand_id, p.name, p.purchase_url, p.category,
               COALESCE((SELECT i.image_url FROM product_images i
                         WHERE i.product_id=p.id ORDER BY i.sort_order LIMIT 1),'')
        FROM products p WHERE p.status='ACTIVE'" > /tmp/products.csv

  DEMO_BCRYPT_HASH='...' python3 deploy/oracle/scripts/seed-demo-world.py \\
      /tmp/products.csv > /tmp/demo-world.sql
  docker compose ... exec -T postgres psql -U fitme -d fitme < /tmp/demo-world.sql
"""
from __future__ import annotations

import csv
import os
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
try:
    from zoneinfo import ZoneInfo

    TZ = ZoneInfo("Asia/Ho_Chi_Minh")
except Exception:  # Windows hosts may lack tzdata; VM Linux is fine.
    TZ = timezone(timedelta(hours=7))

SEED = 20261120
rng = random.Random(SEED)
TODAY = date.today()
START = date(2026, 9, 15)

# 1 admin + 10 brand owners + user + premium + 142 consumers = 155
CONSUMER_COUNT = 142
PREMIUM_COUNT = 18
REVIEW_COUNT = 95
COMMUNITY_POSTS = 28
LEAD_USERS = 55

BCRYPT_HASH = os.environ.get("DEMO_BCRYPT_HASH", "")
PREMIUM_PLAN_CODE = os.environ.get("DEMO_PREMIUM_PLAN_CODE", "PREMIUM_MONTHLY")

FIRST = [
    "An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Hương", "Khánh",
    "Lan", "Linh", "Minh", "Nam", "Ngọc", "Phúc", "Quân", "Sơn", "Trang", "Tuấn",
    "Uyên", "Vân", "Vy", "Yến", "Đức", "Thảo", "Nhung", "Khoa", "My", "Phương",
    "Thy", "Châu", "Như", "Quỳnh", "Đạt", "Long", "Kiên", "Tâm", "Hạnh", "Oanh",
]
LAST = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
    "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Tô", "Mai", "Trịnh",
]
DOMAINS = (
    ["gmail.com"] * 58
    + ["yahoo.com"] * 14
    + ["outlook.com"] * 10
    + ["hotmail.com"] * 7
    + ["icloud.com"] * 6
    + ["mail.com"] * 3
    + ["ueh.edu.vn"] * 2
    + ["student.ctu.edu.vn"] * 2
)

# Short, uneven Vietnamese — sounds like shoppers, not copywriters.
REVIEWS = [
    (5, "Mặc vừa, vải mềm. Ship nhanh."),
    (5, "Đẹp hơn trên ảnh một chút, mình lấy size M ổn."),
    (4, "Form ổn. Chỉ hơi mỏng nếu mặc mùa mưa."),
    (5, "Mua lần 2 rồi, màu đen bền."),
    (3, "Vải ok nhưng giao chậm 3 ngày so với dự kiến."),
    (4, "Mặc đi học được, không bị xù sau 1 tuần."),
    (5, "Size chart chuẩn. Cao 1m58 nặng 48kg lấy S."),
    (2, "Màu lệch ảnh khá nhiều, hơi thất vọng."),
    (4, "Giá ổn trong tầm. Sẽ xem thêm item khác."),
    (5, "Người bán đóng gói kỹ, không bị nhăn."),
    (3, "Ổn. Không wow nhưng dùng được."),
    (4, "Quần ống rộng dễ phối áo thun."),
    (5, "Mặc thử ở nhà thấy form đẹp, để dành đi chơi."),
    (4, "Chất dày vừa, không bí. Ủng hộ."),
    (5, "Đã mua thêm màu be."),
    (3, "Áo hơi rộng vai. Lần sau xuống size."),
    (4, "Nhìn basic nhưng mặc lên sạch sẽ."),
    (5, "Bạn mình hỏi link nên review luôn."),
    (4, "May chắc, đường chỉ đều."),
    (2, "Giao thiếu phụ kiện nhỏ. Đã nhắn shop."),
    (5, "Hợp gu mình. Không có gì để chê."),
    (4, "Mặc đi làm văn phòng cũng ổn."),
    (3, "Vải hơi cứng lúc mới mang về, giặt 1 lần thì đỡ."),
    (5, "Ảnh khách mặc thật gần với hàng nhận."),
    (4, "Tạm ổn so với giá."),
]

CAPTIONS = [
    "Outfit đi cà phê cuối tuần.",
    "Mặc thử set này thấy ổn hơn mình nghĩ.",
    "Tone trung tính dễ phối.",
    "Đi học / đi làm dùng tạm được.",
    "Mới mua, chưa biết giặt máy có xù không.",
    "Ai bảo basic là chán đâu.",
    "Mix với giày có sẵn trong tủ.",
    "Hôm nay trời dịu nên mặc được.",
    "Form rộng mình hợp hơn ôm.",
    "Đợi sale nên mới chốt.",
    "Ảnh chụp ngoài hành lang, ánh sáng yếu tí.",
    "Set này mình mặc đi ăn tối.",
    "Không cầu kỳ, mặc cho tiện.",
    "Tham khảo size trên FitMe rồi mới mua.",
    "Màu thực tế tối hơn ảnh shop một chút.",
]

COMMENTS = [
    "Mặc đẹp đó.",
    "Cho mình xin size áo với.",
    "Nhìn mát mắt.",
    "Link quần đâu bạn?",
    "Hợp thật.",
    "Mình cũng đang để ý cái áo này.",
    "Form rộng nhìn cao hơn.",
    "Chụp ngoài trời chắc đẹp hơn.",
    "Cảm ơn, mình lưu lại.",
    "Giá khoảng bao nhiêu vậy?",
    "Đi làm mặc được không?",
    "Màu này dễ bẩn không bạn?",
]

REPLIES = [
    "Size M nha.",
    "Mình để link trong bài rồi.",
    "Cảm ơn bạn.",
    "Đi làm ok nếu dress code thoải mái.",
    "Giặt tay lần đầu cho chắc.",
]


@dataclass
class Product:
    id: str
    brand_id: str
    name: str
    purchase_url: str
    category: str
    image_url: str


@dataclass
class User:
    id: str
    email: str
    name: str
    signup: date
    gender: str
    premium: bool


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
        f"{f[0]}.{l}{rng.randint(1, 9)}",
        f"{f}.{rng.randint(1, 99)}",
        f"{l}{f}{rng.randint(1, 40)}",
        f"{f}_{l[:3]}",
    ]
    local = styles[i % len(styles)]
    local = "".join(ch for ch in local if ch.isalnum() or ch in "._")[:28]
    return f"{local}@{rng.choice(DOMAINS)}"


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "$$" + value.replace("$", "") + "$$"


def ts(day: date, hour: int | None = None, minute: int | None = None) -> str:
    h = hour if hour is not None else rng.randint(8, 21)
    m = minute if minute is not None else rng.randint(0, 59)
    local = datetime(day.year, day.month, day.day, h, m, tzinfo=TZ)
    return local.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def visitors_for(day: date) -> int:
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


def role_for_category(category: str) -> str:
    c = (category or "").lower()
    if any(k in c for k in ("quần", "jean", "short", "skirt", "váy")):
        return "BOTTOM"
    if any(k in c for k in ("áo khoác", "jacket", "hoodie", "cardigan", "blazer")):
        return "OUTERWEAR"
    if any(k in c for k in ("giày", "sneaker", "dép", "boot")):
        return "SHOES"
    if any(k in c for k in ("nón", "túi", "belt", "phụ kiện", "cap")):
        return "ACCESSORY"
    if any(k in c for k in ("đầm", "jumpsuit", "set bộ", "bodysuit")):
        return "ONE_PIECE"
    return "TOP"


def load_products(path: Path) -> list[Product]:
    rows: list[Product] = []
    with path.open(encoding="utf-8", newline="") as f:
        # Pipe-separated to avoid commas inside product names/URLs.
        reader = csv.reader(f, delimiter="|")
        for row in reader:
            if len(row) < 6:
                continue
            pid, brand_id, name, purchase_url, category, image_url = row[:6]
            if not pid or not brand_id:
                continue
            rows.append(
                Product(
                    id=pid.strip(),
                    brand_id=brand_id.strip(),
                    name=name.strip(),
                    purchase_url=(purchase_url or "").strip() or "https://example.com",
                    category=(category or "").strip(),
                    image_url=(image_url or "").strip(),
                )
            )
    if len(rows) < 20:
        raise SystemExit(f"Need >=20 active products in CSV, got {len(rows)}")
    return rows


def build_users() -> list[User]:
    users: list[User] = []
    used: set[str] = set()
    for i in range(CONSUMER_COUNT):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        em = email_for(first, last, i)
        n = 0
        while em in used:
            n += 1
            em = email_for(first, last, i + n * 19)
        used.add(em)
        signup = START + timedelta(days=rng.randint(0, max(1, (TODAY - START).days - 2)))
        gender = rng.choices(["FEMALE", "MALE", "OTHER"], weights=[62, 35, 3])[0]
        users.append(
            User(
                id=str(uuid.uuid4()),
                email=em,
                name=f"{last} {first}",
                signup=signup,
                gender=gender,
                premium=False,
            )
        )
    premium_idx = list(range(CONSUMER_COUNT))
    rng.shuffle(premium_idx)
    for i in premium_idx[:PREMIUM_COUNT]:
        users[i].premium = True
    return users


def emit(sql: str) -> None:
    print(sql)


def main() -> None:
    if not BCRYPT_HASH.startswith("$2"):
        raise SystemExit("DEMO_BCRYPT_HASH must be a bcrypt hash")
    if len(sys.argv) < 2:
        raise SystemExit("Usage: seed-demo-world.py /tmp/products.csv")

    products = load_products(Path(sys.argv[1]))
    by_brand: dict[str, list[Product]] = {}
    for p in products:
        by_brand.setdefault(p.brand_id, []).append(p)
    users = build_users()

    emit("-- FitMe demo world ~155 accounts (deterministic seed)")
    emit("BEGIN;")

    # --- wipe previous consumer cohort (keep staff / brand owners / core demos)
    emit(
        """
-- Wipe prior demo consumers and engagement (keep admin/brand owners/core demos)
DELETE FROM community_comments;
DELETE FROM community_post_likes;
DELETE FROM community_post_saves;
DELETE FROM community_follows;
DELETE FROM community_posts;
DELETE FROM product_review_images;
DELETE FROM product_reviews;
DELETE FROM brand_leads;
DELETE FROM buy_click_events WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM analytics_events WHERE event_type LIKE 'demo.%'
   OR user_id IN (
     SELECT id FROM user_accounts
     WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
   );
DELETE FROM fitken_ledger WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM daily_checkins WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM consumer_subscriptions WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM consumer_billing_orders WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM site_visits;
DELETE FROM user_activity_days WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM outfit_gallery_images WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM preview_generations WHERE try_on_request_id IN (
  SELECT id FROM try_on_requests WHERE user_id IN (
    SELECT id FROM user_accounts
    WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
  )
);
DELETE FROM try_on_items WHERE try_on_request_id IN (
  SELECT id FROM try_on_requests WHERE user_id IN (
    SELECT id FROM user_accounts
    WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
  )
);
DELETE FROM try_on_requests WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM body_profiles WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM style_profiles WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM consent_records WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM fitken_wallets WHERE user_id IN (
  SELECT id FROM user_accounts
  WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai')
);
DELETE FROM user_accounts
WHERE role = 'USER' AND email NOT IN ('user@fitme.ai', 'premium@fitme.ai');
"""
    )

    # --- consumers
    for u in users:
        created = ts(u.signup)
        plan = "PREMIUM" if u.premium else "FREE"
        emit(
            "INSERT INTO user_accounts "
            "(id, email, password_hash, display_name, role, email_verified, status, consumer_plan, created_at, updated_at) "
            f"VALUES ('{u.id}'::uuid, {sql_str(u.email)}, '{BCRYPT_HASH}', {sql_str(u.name)}, "
            f"'USER', TRUE, 'ACTIVE', '{plan}', '{created}'::timestamp, '{created}'::timestamp);"
        )

    # --- body + style profiles (~70%)
    styles = ["CASUAL", "STREETWEAR", "MINIMAL", "SMART_CASUAL", "Y2K", "KOREAN"]
    for u in users:
        if rng.random() > 0.72:
            continue
        height = rng.randint(152, 178) if u.gender == "FEMALE" else rng.randint(165, 185)
        weight = round(rng.uniform(42, 62), 1) if u.gender == "FEMALE" else round(rng.uniform(55, 82), 1)
        fit = rng.choice(["SLIM", "REGULAR", "RELAXED", "OVERSIZE"])
        emit(
            "INSERT INTO body_profiles "
            "(id, user_id, height_cm, weight_kg, fit_preference, skin_tone, gender, created_at, updated_at) "
            f"VALUES (gen_random_uuid(), '{u.id}'::uuid, {height}, {weight}, '{fit}', "
            f"'{rng.choice(['LIGHT', 'MEDIUM', 'TAN', 'UNSURE'])}', '{u.gender}', "
            f"'{ts(u.signup)}'::timestamp, '{ts(u.signup)}'::timestamp);"
        )
        if rng.random() < 0.55:
            primary = rng.choice(styles)
            emit(
                "INSERT INTO style_profiles "
                "(id, user_id, primary_style, secondary_styles, risk_level, artistic_mode, "
                "preferred_colors, avoided_colors, created_at, updated_at) "
                f"VALUES (gen_random_uuid(), '{u.id}'::uuid, '{primary}', "
                f"'[]'::jsonb, '{rng.choice(['SAFE', 'BALANCED', 'BOLD'])}', FALSE, "
                f"'[]'::jsonb, '[]'::jsonb, '{ts(u.signup)}'::timestamp, '{ts(u.signup)}'::timestamp);"
            )

    # --- wallets + ledger
    for u in users:
        bonus = rng.randint(4, 36)
        sub = 15 if u.premium else 0
        created = ts(u.signup)
        emit(
            "INSERT INTO fitken_wallets "
            "(user_id, subscription_remaining, bonus_remaining, created_at, updated_at) "
            f"VALUES ('{u.id}'::uuid, {sub}, {bonus}, '{created}'::timestamp, '{created}'::timestamp);"
        )
        emit(
            "INSERT INTO fitken_ledger "
            "(id, user_id, entry_type, delta, subscription_delta, bonus_delta, balance_after, note, created_at) "
            f"VALUES (gen_random_uuid(), '{u.id}'::uuid, 'BONUS_GRANT', {bonus}, 0, {bonus}, {bonus + sub}, "
            f"{sql_str('Thưởng mở tài khoản')}, '{created}'::timestamp);"
        )
        if u.premium:
            emit(
                "INSERT INTO fitken_ledger "
                "(id, user_id, entry_type, delta, subscription_delta, bonus_delta, balance_after, "
                "reference_type, note, created_at) "
                f"VALUES (gen_random_uuid(), '{u.id}'::uuid, 'SUBSCRIPTION_GRANT', {sub}, {sub}, 0, {bonus + sub}, "
                f"'BILLING_PLAN', {sql_str('Gói Premium tháng')}, '{created}'::timestamp);"
            )

    # Premium subscriptions (plan resolved at apply time)
    emit(
        f"""
INSERT INTO consumer_subscriptions (id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, p.id, 'ACTIVE',
       u.created_at, u.created_at + INTERVAL '30 days', u.created_at, u.created_at
FROM user_accounts u
CROSS JOIN LATERAL (
  SELECT id FROM billing_plans
  WHERE code = '{PREMIUM_PLAN_CODE}' AND active
  ORDER BY sort_order NULLS LAST
  LIMIT 1
) p
WHERE u.consumer_plan = 'PREMIUM'
  AND u.email NOT IN ('premium@fitme.ai')
  AND NOT EXISTS (SELECT 1 FROM consumer_subscriptions cs WHERE cs.user_id = u.id);
"""
    )
    # ensure core premium stays premium
    emit(
        """
UPDATE user_accounts SET consumer_plan = 'PREMIUM'
WHERE email = 'premium@fitme.ai' AND consumer_plan <> 'PREMIUM';
INSERT INTO consumer_subscriptions (id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, p.id, 'ACTIVE', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW(), NOW()
FROM user_accounts u
CROSS JOIN LATERAL (
  SELECT id FROM billing_plans WHERE code = 'PREMIUM_MONTHLY' AND active LIMIT 1
) p
WHERE u.email = 'premium@fitme.ai'
  AND NOT EXISTS (SELECT 1 FROM consumer_subscriptions cs WHERE cs.user_id = u.id);
"""
    )

    # --- activity days
    for u in users:
        emit(
            f"INSERT INTO user_activity_days (user_id, activity_date) VALUES ('{u.id}'::uuid, '{u.signup}') "
            "ON CONFLICT DO NOTHING;"
        )
        span = (TODAY - u.signup).days
        if span <= 0:
            continue
        returns = rng.randint(2, min(22, span + 1))
        for _ in range(returns):
            d = u.signup + timedelta(days=rng.randint(0, span))
            emit(
                f"INSERT INTO user_activity_days (user_id, activity_date) VALUES ('{u.id}'::uuid, '{d}') "
                "ON CONFLICT DO NOTHING;"
            )

    # --- site visits
    day = START
    while day <= TODAY:
        for _ in range(visitors_for(day)):
            vid = str(uuid.uuid4())
            uid = "NULL"
            eligible = [u for u in users if u.signup <= day]
            if eligible and rng.random() < 0.48:
                uid = f"'{rng.choice(eligible).id}'::uuid"
            views = min(28, max(1, int(rng.lognormvariate(0.8, 0.6))))
            first = ts(day)
            emit(
                "INSERT INTO site_visits (visit_date, visitor_id, user_id, page_views, first_seen_at, last_seen_at) "
                f"VALUES ('{day}', '{vid}'::uuid, {uid}, {views}, "
                f"'{first}'::timestamp, '{first}'::timestamp + INTERVAL '{rng.randint(2, 90)} minutes') "
                "ON CONFLICT DO NOTHING;"
            )
        day += timedelta(days=1)

    # --- try-ons with product items (~60% users, 1-3 sessions)
    tryon_authors: list[tuple[User, str, Product]] = []
    for u in users:
        if rng.random() > 0.60:
            continue
        sessions = rng.randint(1, 3 if u.premium else 2)
        for _ in range(sessions):
            when = u.signup + timedelta(days=rng.randint(0, max(0, (TODAY - u.signup).days)))
            tid = str(uuid.uuid4())
            product = rng.choice(products)
            tryon_authors.append((u, tid, product))
            emit(
                "INSERT INTO try_on_requests "
                "(id, user_id, occasion, preferred_fit, status, saved, created_at, updated_at) "
                f"VALUES ('{tid}'::uuid, '{u.id}'::uuid, "
                f"{sql_str(rng.choice(['Đi học', 'Đi làm', 'Cuối tuần', 'Hẹn cà phê', None]))}, "
                f"'{rng.choice(['SLIM', 'REGULAR', 'RELAXED', 'OVERSIZE'])}', 'COMPLETED', "
                f"{'TRUE' if rng.random() < 0.25 else 'FALSE'}, "
                f"'{ts(when)}'::timestamp, '{ts(when)}'::timestamp);"
            )
            emit(
                "INSERT INTO try_on_items (id, try_on_request_id, product_id, role, selected_size, selected_color) "
                f"VALUES (gen_random_uuid(), '{tid}'::uuid, '{product.id}'::uuid, "
                f"'{role_for_category(product.category)}', "
                f"{sql_str(rng.choice(['S', 'M', 'L', 'XL']))}, "
                f"{sql_str(rng.choice(['Đen', 'Trắng', 'Be', 'Xám', 'Navy']))});"
            )
            # sometimes add a second piece
            if rng.random() < 0.35:
                other = rng.choice(products)
                emit(
                    "INSERT INTO try_on_items (id, try_on_request_id, product_id, role, selected_size, selected_color) "
                    f"VALUES (gen_random_uuid(), '{tid}'::uuid, '{other.id}'::uuid, "
                    f"'{role_for_category(other.category)}', "
                    f"{sql_str(rng.choice(['S', 'M', 'L']))}, "
                    f"{sql_str(rng.choice(['Đen', 'Trắng', 'Be']))});"
                )
            emit(
                "INSERT INTO analytics_events (id, event_type, user_id, brand_id, product_id, try_on_request_id, created_at) "
                f"VALUES (gen_random_uuid(), 'demo.try_on', '{u.id}'::uuid, '{product.brand_id}'::uuid, "
                f"'{product.id}'::uuid, '{tid}'::uuid, '{ts(when)}'::timestamp);"
            )

    # --- reviews (unique product+user)
    reviewed: set[tuple[str, str]] = set()
    review_n = 0
    while review_n < REVIEW_COUNT and review_n < len(users) * 2:
        u = rng.choice(users)
        p = rng.choice(products)
        key = (u.id, p.id)
        if key in reviewed:
            continue
        reviewed.add(key)
        rating, content = rng.choice(REVIEWS)
        when = u.signup + timedelta(days=rng.randint(1, max(1, (TODAY - u.signup).days)))
        reward = 2 if (rating >= 4 and len(content) >= 20 and rng.random() < 0.35) else 0
        rid = str(uuid.uuid4())
        emit(
            "INSERT INTO product_reviews "
            "(id, product_id, user_id, rating, content, status, reward_granted, created_at, updated_at) "
            f"VALUES ('{rid}'::uuid, '{p.id}'::uuid, '{u.id}'::uuid, {rating}, {sql_str(content)}, "
            f"'VISIBLE', {reward}, '{ts(when)}'::timestamp, '{ts(when)}'::timestamp) "
            "ON CONFLICT (product_id, user_id) DO NOTHING;"
        )
        if reward:
            emit(
                "INSERT INTO fitken_ledger "
                "(id, user_id, entry_type, delta, bonus_delta, balance_after, reference_type, reference_id, note, created_at) "
                f"SELECT gen_random_uuid(), '{u.id}'::uuid, 'REVIEW_REWARD', {reward}, {reward}, "
                f"(SELECT subscription_remaining + bonus_remaining + {reward} FROM fitken_wallets WHERE user_id = '{u.id}'::uuid), "
                f"'PRODUCT_REVIEW', '{rid}'::uuid, {sql_str('Thưởng đánh giá')}, '{ts(when)}'::timestamp "
                f"WHERE NOT EXISTS ("
                f"  SELECT 1 FROM fitken_ledger "
                f"  WHERE entry_type = 'REVIEW_REWARD' AND reference_id = '{rid}'::uuid"
                f");"
            )
            emit(
                f"UPDATE fitken_wallets SET bonus_remaining = bonus_remaining + {reward}, updated_at = NOW() "
                f"WHERE user_id = '{u.id}'::uuid;"
            )
        review_n += 1

    # --- buy clicks + brand leads + consent
    lead_users = rng.sample(users, k=min(LEAD_USERS, len(users)))
    for u in lead_users:
        emit(
            "INSERT INTO consent_records (id, user_id, consent_type, consent_version, accepted, created_at) "
            f"VALUES (gen_random_uuid(), '{u.id}'::uuid, 'BRAND_LEAD_SHARING', '2026-01', TRUE, "
            f"'{ts(u.signup)}'::timestamp);"
        )
        clicks = rng.randint(1, 3)
        used_days: set[date] = set()
        for _ in range(clicks):
            p = rng.choice(products)
            day = u.signup + timedelta(days=rng.randint(0, max(0, (TODAY - u.signup).days)))
            # one lead per user+product+day
            if day in used_days and rng.random() < 0.5:
                continue
            used_days.add(day)
            click_id = str(uuid.uuid4())
            size = rng.choice(["S", "M", "L", "XL"])
            color = rng.choice(["Đen", "Trắng", "Be", "Xám"])
            emit(
                "INSERT INTO buy_click_events "
                "(id, user_id, product_id, selected_size, selected_color, source_page, purchase_url, channel, created_at) "
                f"VALUES ('{click_id}'::uuid, '{u.id}'::uuid, '{p.id}'::uuid, {sql_str(size)}, {sql_str(color)}, "
                f"'/discover', {sql_str(p.purchase_url)}, 'WEB', '{ts(day)}'::timestamp);"
            )
            sold = "NOW() - INTERVAL '2 days'" if rng.random() < 0.18 else "NULL"
            emit(
                "INSERT INTO brand_leads "
                "(id, brand_id, product_id, user_id, buy_click_event_id, size, color, created_at, lead_date, confirmed_sold_at) "
                f"VALUES (gen_random_uuid(), '{p.brand_id}'::uuid, '{p.id}'::uuid, '{u.id}'::uuid, "
                f"'{click_id}'::uuid, {sql_str(size)}, {sql_str(color)}, '{ts(day)}'::timestamptz, '{day}', {sold}) "
                "ON CONFLICT DO NOTHING;"
            )

    # --- community posts from users who tried on (use real product photos)
    pool = [(u, tid, p) for (u, tid, p) in tryon_authors if p.image_url]
    rng.shuffle(pool)
    posts: list[tuple[str, User]] = []
    for i, (u, tid, p) in enumerate(pool[:COMMUNITY_POSTS]):
        post_id = str(uuid.uuid4())
        share = f"w{SEED % 10000:04d}{i:04d}"
        when = u.signup + timedelta(days=rng.randint(0, max(0, (TODAY - u.signup).days)))
        title = rng.choice(["Outfit hôm nay", "Set mới", "Mix đơn giản", "Đi chơi cuối tuần", None])
        caption = rng.choice(CAPTIONS)
        likes = rng.randint(2, 28)
        views = likes * rng.randint(4, 12) + rng.randint(10, 80)
        emit(
            "INSERT INTO community_posts "
            "(id, user_id, try_on_request_id, share_code, title, caption, style_label, occasion, "
            "brand_ids, product_ids, image_url, visibility, like_count, comment_count, view_count, "
            "created_at, updated_at) "
            f"VALUES ('{post_id}'::uuid, '{u.id}'::uuid, '{tid}'::uuid, {sql_str(share)}, "
            f"{sql_str(title)}, {sql_str(caption)}, "
            f"{sql_str(rng.choice(['Casual', 'Streetwear', 'Minimal', 'Smart casual']))}, "
            f"{sql_str(rng.choice(['Đi học', 'Đi làm', 'Cuối tuần', 'Hẹn hò']))}, "
            f"{sql_str(p.brand_id)}, {sql_str(p.id)}, {sql_str(p.image_url)}, 'PUBLIC', "
            f"0, 0, {views}, '{ts(when)}'::timestamp, '{ts(when)}'::timestamp);"
        )
        posts.append((post_id, u))

        # real like rows then sync count
        likers = rng.sample(users, k=min(likes, len(users)))
        for liker in likers:
            if liker.id == u.id:
                continue
            emit(
                "INSERT INTO community_post_likes (post_id, user_id, created_at) "
                f"VALUES ('{post_id}'::uuid, '{liker.id}'::uuid, '{ts(when)}'::timestamp) "
                "ON CONFLICT DO NOTHING;"
            )
        emit(
            f"UPDATE community_posts SET like_count = "
            f"(SELECT COUNT(*) FROM community_post_likes WHERE post_id = '{post_id}'::uuid) "
            f"WHERE id = '{post_id}'::uuid;"
        )

        # comments (+ optional reply) — triggers maintain comment_count
        n_comments = rng.randint(1, 4)
        commenters = rng.sample([x for x in users if x.id != u.id], k=min(n_comments, len(users) - 1))
        for c_user in commenters:
            cid = str(uuid.uuid4())
            emit(
                "INSERT INTO community_comments (id, post_id, user_id, content, created_at, updated_at) "
                f"VALUES ('{cid}'::uuid, '{post_id}'::uuid, '{c_user.id}'::uuid, "
                f"{sql_str(rng.choice(COMMENTS))}, '{ts(when)}'::timestamp, '{ts(when)}'::timestamp);"
            )
            if rng.random() < 0.35:
                emit(
                    "INSERT INTO community_comments "
                    "(id, post_id, user_id, parent_id, parent_author_id, content, created_at, updated_at) "
                    f"VALUES (gen_random_uuid(), '{post_id}'::uuid, '{u.id}'::uuid, '{cid}'::uuid, "
                    f"'{c_user.id}'::uuid, {sql_str(rng.choice(REPLIES))}, "
                    f"'{ts(when)}'::timestamp, '{ts(when)}'::timestamp);"
                )

        # saves
        for saver in rng.sample(users, k=min(rng.randint(1, 8), len(users))):
            if saver.id == u.id:
                continue
            emit(
                "INSERT INTO community_post_saves (post_id, user_id, created_at) "
                f"VALUES ('{post_id}'::uuid, '{saver.id}'::uuid, '{ts(when)}'::timestamp) "
                "ON CONFLICT DO NOTHING;"
            )

    # follows among active posters / premium
    follow_candidates = [u for u, _ in [(p[1], p[0]) for p in posts]]
    follow_candidates = list({u.id: u for u in follow_candidates}.values())
    for follower in rng.sample(users, k=min(40, len(users))):
        targets = rng.sample(follow_candidates, k=min(rng.randint(1, 3), len(follow_candidates)))
        for t in targets:
            if t.id == follower.id:
                continue
            emit(
                "INSERT INTO community_follows (follower_id, followed_id, created_at) "
                f"VALUES ('{follower.id}'::uuid, '{t.id}'::uuid, NOW()) ON CONFLICT DO NOTHING;"
            )

    emit("COMMIT;")
    emit(
        """
SELECT
  (SELECT COUNT(*) FROM user_accounts) AS accounts,
  (SELECT COUNT(*) FROM user_accounts WHERE role='USER') AS users,
  (SELECT COUNT(*) FROM user_accounts WHERE consumer_plan='PREMIUM') AS premium,
  (SELECT COUNT(*) FROM product_reviews) AS reviews,
  (SELECT COUNT(*) FROM brand_leads) AS leads,
  (SELECT COUNT(*) FROM community_posts) AS posts,
  (SELECT COUNT(*) FROM community_comments) AS comments,
  (SELECT COUNT(*) FROM try_on_requests) AS tryons,
  (SELECT COUNT(*) FROM try_on_items) AS tryon_items,
  (SELECT COUNT(*) FROM site_visits) AS visits,
  (SELECT COUNT(*) FROM fitken_ledger) AS ledger;
"""
    )


if __name__ == "__main__":
    main()
