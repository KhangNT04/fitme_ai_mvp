#!/usr/bin/env node
/**
 * Post-deploy smoke test against a live FitMe environment (frontend + API through the Vercel proxy).
 *
 * Usage:
 *   FITME_EMAIL=you@example.com FITME_PASSWORD=... node scripts/prod-smoke.mjs [--tryon] [--review] [--payos]
 *
 * Opt-in flags (they cost money or leave public data behind):
 *   --tryon   one AI try-on with FITME_PHOTO (calls the paid VTON provider, spends 1 Fitken)
 *   --review  posts a public product review with FITME_REVIEW_PHOTO (+3 Fitken, once per product)
 *   --payos   creates real PayOS payment links for an order and the Pro plan (nothing is paid)
 *
 * Env: FITME_BASE_URL (default https://fitme-ai-mvp.vercel.app), FITME_API_URL (default <base>/api/v1),
 *      FITME_PHOTO, FITME_REVIEW_PHOTO (image paths).
 */
import fs from "node:fs";
import path from "node:path";

const flags = new Set(process.argv.slice(2));
const BASE = (process.env.FITME_BASE_URL || "https://fitme-ai-mvp.vercel.app").replace(/\/$/, "");
const API = (process.env.FITME_API_URL || `${BASE}/api/v1`).replace(/\/$/, "");
const EMAIL = process.env.FITME_EMAIL;
const PASSWORD = process.env.FITME_PASSWORD;

const results = [];
let token = null;

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(method, urlPath, body, { auth = true, form = false, timeoutMs = 90_000 } = {}) {
  const headers = {};
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";
  const res = await fetch(API + urlPath, {
    method,
    headers,
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(`${method} ${urlPath} -> HTTP ${res.status} (non-JSON: ${text.slice(0, 120)})`, res.status);
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(
      `${method} ${urlPath} -> HTTP ${res.status} ${json.errorCode ?? ""} ${json.error ?? json.message ?? ""}`.trim(),
      res.status,
      json.errorCode,
    );
  }
  return json.data;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, status: "PASS", detail: detail ?? "", ms: Date.now() - started });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    if (e?.skip) {
      results.push({ name, status: "SKIP", detail: e.message });
      console.log(`SKIP  ${name} — ${e.message}`);
      return;
    }
    results.push({ name, status: "FAIL", detail: e.message });
    console.log(`FAIL  ${name} — ${e.message}`);
  }
}

const skip = (message) => Object.assign(new Error(message), { skip: true });
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};
const items = (data) => (Array.isArray(data) ? data : (data?.items ?? data?.content ?? []));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function imageBlob(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { blob: new Blob([buf], { type }), name: `upload${ext || ".jpg"}` };
}

// ---------------------------------------------------------------- public pages & catalog

const pages = ["/", "/discover", "/try-on", "/pricing", "/rewards", "/cart", "/checkout", "/orders",
  "/profile/gallery", "/profile/addresses", "/auth/login", "/auth/register", "/brand/login", "/admin/login"];

await step("frontend pages respond", async () => {
  const bad = [];
  for (const p of pages) {
    const res = await fetch(BASE + p, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    if (res.status >= 400) bad.push(`${p}=${res.status}`);
  }
  assert(bad.length === 0, bad.join(", "));
  return `${pages.length} routes`;
});

let products = [];
let purchasable = null;
await step("GET /products", async () => {
  products = items(await call("GET", "/products", undefined, { auth: false, timeoutMs: 180_000 }));
  assert(products.length > 0, "catalog is empty");
  return `${products.length} products`;
});

await step("GET /products/{id} with stock", async () => {
  for (const p of products.filter((x) => x.purchasable).slice(0, 10)) {
    const detail = await call("GET", `/products/${p.id}`, undefined, { auth: false });
    const variant = (detail.variants ?? []).find((v) => (v.stockQuantity ?? 0) > 0);
    if (variant) {
      purchasable = { product: detail, variant };
      return `${detail.name} / ${variant.sizeLabel ?? ""} ${variant.colorName ?? ""} stock=${variant.stockQuantity}`;
    }
  }
  throw new Error("no purchasable product with stock among the first 10 purchasable products");
});

await step("GET /products/{id}/reviews", async () => {
  const id = (purchasable?.product ?? products[0])?.id;
  const data = await call("GET", `/products/${id}/reviews`, undefined, { auth: false });
  return `total=${data.totalCount} avg=${data.averageRating}`;
});

let proPlan = null;
await step("GET /plans has FitMe Pro 49k / 15 Fitken / 2 freeship", async () => {
  const plans = items(await call("GET", "/plans", undefined, { auth: false }));
  proPlan = plans.find((p) => p.code === "PRO_MONTHLY") ?? plans[0];
  assert(proPlan, "no plans");
  assert(proPlan.priceVnd === 49000, `price ${proPlan.priceVnd}`);
  assert(proPlan.fitkenAmount === 15, `fitken ${proPlan.fitkenAmount}`);
  assert(proPlan.freeshipVouchers === 2, `freeship ${proPlan.freeshipVouchers}`);
  return `${proPlan.name} ${proPlan.priceVnd}đ`;
});

await step("GET /auth/captcha", async () => {
  const c = await call("GET", "/auth/captcha", undefined, { auth: false });
  assert(c.captchaId && /\d+ \+ \d+/.test(c.question), "bad captcha");
});

// ---------------------------------------------------------------- authenticated consumer flows

if (!EMAIL || !PASSWORD) {
  console.log("\nFITME_EMAIL / FITME_PASSWORD not set — skipping authenticated checks.");
} else {
  await step("POST /auth/login", async () => {
    const data = await call("POST", "/auth/login", { email: EMAIL, password: PASSWORD }, { auth: false });
    token = data.accessToken ?? data.token;
    assert(token, "no access token in login response");
    return `${data.email} plan=${data.consumerPlan}`;
  });
}

if (token) {
  let wallet = null;
  const balance = async () => (await call("GET", "/me/fitken")).balance;

  await step("GET /me/fitken (trial granted)", async () => {
    wallet = await call("GET", "/me/fitken");
    assert(wallet.trialGranted, "trial not granted");
    return `balance=${wallet.balance} (sub ${wallet.subscriptionRemaining} + bonus ${wallet.bonusRemaining}) plan=${wallet.plan}`;
  });

  await step("GET /me/fitken/ledger", async () => {
    const ledger = items(await call("GET", "/me/fitken/ledger"));
    assert(ledger.some((e) => e.entryType === "TRIAL_GRANT"), "no TRIAL_GRANT entry");
    return `${ledger.length} entries`;
  });

  for (const p of ["/me/entitlement", "/me/vouchers", "/me/subscription/orders", "/me/gallery", "/orders", "/rewards"]) {
    await step(`GET ${p}`, async () => {
      const d = await call("GET", p);
      return Array.isArray(d) ? `${d.length} items` : d?.total !== undefined ? `total=${d.total}` : "";
    });
  }

  await step("POST /rewards/checkin", async () => {
    try {
      const r = await call("POST", "/rewards/checkin");
      return `streak=${r.currentStreak} reward=${r.rewardGranted} balance=${r.balance}`;
    } catch (e) {
      if (e.code === "ALREADY_CHECKED_IN") return "already checked in today";
      throw e;
    }
  });

  await step("POST /rewards/share (+2 Fitken, duplicate rejected)", async () => {
    const url = `https://www.facebook.com/fitme.smoke/posts/${Date.now()}`;
    const before = await balance();
    try {
      await call("POST", "/rewards/share", { postUrl: url });
    } catch (e) {
      if (e.code === "SHARE_DAILY_LIMIT") return "daily limit already used today";
      throw e;
    }
    const after = await balance();
    assert(after === before + 2, `balance ${before} -> ${after}`);
    try {
      await call("POST", "/rewards/share", { postUrl: url });
      throw new Error("duplicate share was accepted");
    } catch (e) {
      assert(["SHARE_DUPLICATE", "SHARE_DAILY_LIMIT"].includes(e.code), `duplicate -> ${e.message}`);
    }
    return `balance ${before} -> ${after}`;
  });

  let addressId = null;
  await step("address book", async () => {
    const list = items(await call("GET", "/me/addresses"));
    if (list.length) {
      addressId = list[0].id;
      return `reuse ${list.length} saved`;
    }
    const a = await call("POST", "/me/addresses", {
      recipientName: "FitMe Smoke", phone: "0901234567", province: "TP. Hồ Chí Minh",
      district: "Quận 1", ward: "Phường Bến Nghé", street: "12 Nguyễn Huệ", defaultAddress: true,
    });
    addressId = a.id;
    return "created";
  });

  const placeOrder = async (paymentMethod) => {
    assert(purchasable, "no purchasable product");
    await call("DELETE", "/cart");
    const { product, variant } = purchasable;
    await call("POST", "/cart/items", { productId: product.id, variantId: variant.id, quantity: 1 });
    const cart = await call("GET", "/cart");
    const cartItemIds = (cart.groups ?? []).flatMap((g) => g.items ?? []).map((i) => i.id);
    assert(cartItemIds.length === 1, `cart has ${cartItemIds.length} items`);
    const preview = await call("POST", "/orders/preview", { addressId, cartItemIds });
    const placed = await call("POST", "/orders", { addressId, cartItemIds, paymentMethod, note: "Smoke test — huỷ ngay" });
    return { preview, placed };
  };

  await step("cart → preview → COD order → detail → tracking → cancel", async () => {
    const { preview, placed } = await placeOrder("COD");
    const order = placed.order;
    assert(order?.id, "no order id");
    assert(order.totalVnd === preview.totalVnd, `total ${order.totalVnd} != preview ${preview.totalVnd}`);
    const detail = await call("GET", `/orders/${order.id}`);
    assert(detail.status === "CONFIRMED", `status ${detail.status}`);
    await call("GET", `/orders/${order.id}/tracking`);
    const cancelled = await call("POST", `/orders/${order.id}/cancel`, { reason: "Smoke test" });
    assert(cancelled.status === "CANCELLED", `after cancel ${cancelled.status}`);
    return `${detail.orderCode ?? order.id} total=${order.totalVnd}đ`;
  });

  if (flags.has("--payos")) {
    await step("PayOS order checkout link → cancel", async () => {
      const { placed } = await placeOrder("PAYOS");
      assert(placed.checkoutUrl?.startsWith("https://"), `checkoutUrl=${placed.checkoutUrl}`);
      assert(!placed.mockPaid, "PayOS is in mock mode");
      await call("POST", `/orders/${placed.order.id}/cancel`, { reason: "Smoke test" });
      return new URL(placed.checkoutUrl).host;
    });

    await step("Pro subscription checkout link", async () => {
      assert(proPlan, "no Pro plan");
      const r = await call("POST", "/me/subscription/checkout", { planId: proPlan.id });
      assert(r.checkoutUrl?.startsWith("https://"), `checkoutUrl=${r.checkoutUrl}`);
      return `${new URL(r.checkoutUrl).host} order=${r.payosOrderCode}`;
    });
  } else {
    results.push({ name: "PayOS links", status: "SKIP", detail: "pass --payos" });
  }

  if (flags.has("--review")) {
    await step("review with photo (+3 Fitken)", async () => {
      const photo = process.env.FITME_REVIEW_PHOTO;
      assert(photo && fs.existsSync(photo), "FITME_REVIEW_PHOTO missing");
      const target = purchasable?.product ?? products[0];
      const before = await balance();
      const { blob, name } = imageBlob(photo);
      const fd = new FormData();
      fd.append("file", blob, name);
      const img = await call("POST", "/reviews/images", fd, { form: true });
      try {
        const r = await call("POST", `/products/${target.id}/reviews`, {
          rating: 5, content: "Áo mặc vừa, chất vải mát, màu giống ảnh.", imageUrls: [img.url],
        });
        const after = await balance();
        assert(r.rewardGranted === 3 && after === before + 3, `reward=${r.rewardGranted} balance ${before} -> ${after}`);
        return `review ${r.review?.id ?? ""} balance ${before} -> ${after}`;
      } catch (e) {
        if (e.code === "REVIEW_EXISTS") return "already reviewed this product";
        throw e;
      }
    });
  } else {
    results.push({ name: "review with photo", status: "SKIP", detail: "pass --review" });
  }

  if (flags.has("--tryon")) {
    await step("AI try-on with user photo (charges 1 Fitken, stored in gallery)", async () => {
      const photo = process.env.FITME_PHOTO;
      assert(photo && fs.existsSync(photo), "FITME_PHOTO missing");
      const eligible = items(await call("GET", "/products?aiTryOnEligible=true", undefined, { auth: false }));
      const top = eligible.find((p) => /top|shirt|tee|áo/i.test(`${p.category} ${p.name}`) && !/khoác|jacket|coat/i.test(p.name));
      assert(top, `no try-on eligible top among ${eligible.length} eligible products`);
      const before = await balance();
      const galleryBefore = (await call("GET", "/me/gallery")).total ?? 0;

      const consent = await call("POST", "/uploads/user-photo/consent");
      const { blob, name } = imageBlob(photo);
      const fd = new FormData();
      fd.append("file", blob, name);
      const upload = await call("POST", `/uploads/user-photo?consentId=${consent.id}`, fd, { form: true, timeoutMs: 120_000 });
      const quality = await call("GET", `/uploads/user-photo/${upload.id}/quality`);

      const tryOn = await call("POST", "/try-on/requests", {
        photoUploadId: upload.id, previewMode: "USER_PHOTO", heightCm: 165, weightKg: 52, preferredFit: "REGULAR",
      });
      await call("POST", `/try-on/requests/${tryOn.id}/items`, { productId: top.id, role: "TOP" });
      let r = await call("POST", `/try-on/requests/${tryOn.id}/generate`,
        { previewMode: "USER_PHOTO", photoUploadId: upload.id }, { timeoutMs: 180_000 });
      for (let i = 0; i < 40 && !["COMPLETED", "FAILED"].includes(r.status); i++) {
        await sleep(6_000);
        r = await call("GET", `/try-on/requests/${tryOn.id}/result`);
      }
      assert(r.status === "COMPLETED", `try-on ended ${r.status}`);
      const after = await balance();
      const galleryAfter = (await call("GET", "/me/gallery")).total ?? 0;
      const isAi = after === before - 1;
      assert(isAi ? galleryAfter === galleryBefore + 1 : galleryAfter === galleryBefore,
        `gallery ${galleryBefore} -> ${galleryAfter} with balance ${before} -> ${after}`);
      return `${top.name}: quality=${quality.qualityStatus} source=${r.previewSource} fitken ${before} -> ${after} ` +
        `gallery ${galleryBefore} -> ${galleryAfter} image=${r.previewImageUrl}`;
    });
  } else {
    results.push({ name: "AI try-on", status: "SKIP", detail: "pass --tryon" });
  }

  await step("AI stylist chat reply", async () => {
    const r = await call("POST", "/stylist/chat/messages",
      { message: "Gợi ý outfit đi cà phê cuối tuần" }, { timeoutMs: 120_000 });
    const reply = r.assistantMessage?.content ?? "";
    assert(reply.length > 0, "empty reply");
    return `${r.type ?? ""} ${reply.slice(0, 60)}`;
  });
}

// ---------------------------------------------------------------- summary

const failed = results.filter((r) => r.status === "FAIL");
console.log(`\n${results.filter((r) => r.status === "PASS").length} passed, ${failed.length} failed, ` +
  `${results.filter((r) => r.status === "SKIP").length} skipped`);
process.exit(failed.length ? 1 : 0);
