# FitMe demo world (~155 accounts)

Script: [`deploy/oracle/scripts/seed-demo-world.py`](../deploy/oracle/scripts/seed-demo-world.py)  
Apply: [`deploy/oracle/scripts/apply-demo-world.sh`](../deploy/oracle/scripts/apply-demo-world.sh)

## Composition

| Cohort | Count | Notes |
|--------|------:|-------|
| Admin | 1 | `admin@fitme.ai` (kept) |
| Brand owners | 10 | `brand@` + 9 catalog `*@fitme.ai` (kept) |
| Core demos | 2 | `user@fitme.ai`, `premium@fitme.ai` (kept) |
| Consumers | 142 | Realistic VN emails/names; wiped & rebuilt |
| **Total** | **155** | |

## Linked activity (same user IDs)

- Body/style profiles (~70% consumers)
- Fitken wallets + ledger (bonus / Premium / review rewards)
- ~18 Premium consumers + core `premium@`
- Site visits + activity days (~2 months)
- Try-ons with `try_on_items` tied to real catalog products
- ~95 product reviews (short Vietnamese, mixed stars)
- Buy clicks → brand leads (with consent)
- ~28 community posts using **real product photos**, with like/comment/save/follow rows

## Apply on Oracle VM

```bash
cd /opt/fitme
git fetch origin main && git reset --hard origin/main
DEMO_BCRYPT_HASH='$2b$10$…' ./deploy/oracle/scripts/apply-demo-world.sh
```

Password for the 142 consumers matches the bcrypt hash you pass (same convention as the previous metrics seed).
