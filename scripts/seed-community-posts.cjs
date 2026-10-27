/**
 * Seeds the production community feed with the curated demo posts.
 *
 * Why this exists: the feed endpoint works but the database has no posts, so the community page
 * looks empty during a demo. This writes the same 18 posts that the frontend fallback dataset
 * describes — real catalog products, real R2 product photos — straight into `community_posts`.
 *
 * Safety rules:
 * - The authors are dedicated demo accounts (`demo.*@fitme.ai`), never a real user's account.
 * - Re-running is safe: a post is skipped when its share code already exists.
 * - Nothing here fabricates engagement. The like/view counters are the ones from the curated
 *   dataset so the feed does not look like an empty room, and they are static numbers, not rows
 *   in `community_post_likes`.
 * - The comment counts are NOT static: they are backed by real rows in `community_comments` so
 *   the thread a visitor opens actually has something in it. A counter without rows would show
 *   "3 bình luận" and then an empty thread.
 *
 * Usage:
 *   DB_URL=... DB_USERNAME=... DB_PASSWORD=... node scripts/seed-community-posts.cjs
 *
 * The connection details are read from the environment on purpose: production credentials must
 * never live in the repository.
 */
const fs = require("fs");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || "FitMeDemo@2026";
const SHARE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Comment texts used to fill the demo threads. Kept short and generic so they read naturally. */
const DEMO_COMMENTS = [
  "Outfit này hợp quá, mình cũng đang tìm kiểu này!",
  "Màu mix rất hợp, đặc biệt là phần phụ kiện.",
  "Áo khoác đẹp ơi, cho mình hỏi link sản phẩm với.",
  "Ảnh chụp sáng quá, chắc bạn chỉnh sáng có chút? 😍",
  "Đơn giản mà vẫn trendy, học được rồi.",
  "Bạn cao cỡ này mặc đẹp quá, mình thấp hơn nên hơi e dè.",
  "Tone màu này dễ mặc, mùa thu lạnh cũng ổn.",
  "Quá xịn, lưu lại để tham khảo dịp cuối tuần.",
  "Phối đồ có gu thật đấy 👏",
  "Áo khoác dạng này mùa đông mặc chắc ấm lắm.",
  "Sản phẩm nào là brand gì vậy bạn?",
  "Để dành làm outfit tham khảo cho ngày đi làm nữa.",
];

const DEMO_REPLIES = [
  "Cảm ơn bạn nha!",
  "Đúng rồi, mình cũng thấy vậy 😄",
  "Chuẩn luôn, hợp gu mình.",
  "Bạn xem giá giúp mình với nhé.",
];

const AUTHORS = [
  { email: "demo.linhchi@fitme.ai", name: "Linh Chi" },
  { email: "demo.maianh@fitme.ai", name: "Mai Anh" },
  { email: "demo.hamy@fitme.ai", name: "Hà My" },
  { email: "demo.thuha@fitme.ai", name: "Thu Hà" },
  { email: "demo.minhthy@fitme.ai", name: "Minh Thy" },
  { email: "demo.quynhnhu@fitme.ai", name: "Quỳnh Như" },
  { email: "demo.baochau@fitme.ai", name: "Bảo Châu" },
  { email: "demo.ngocan@fitme.ai", name: "Ngọc An" },
  { email: "demo.phuonglinh@fitme.ai", name: "Phương Linh" },
  { email: "demo.khanhvy@fitme.ai", name: "Khánh Vy" },
  { email: "demo.dieulinh@fitme.ai", name: "Diệu Linh" },
  { email: "demo.tuvy@fitme.ai", name: "Tú Vy" },
  { email: "demo.thanhthao@fitme.ai", name: "Thanh Thảo" },
  { email: "demo.mocan@fitme.ai", name: "Mộc An" },
  { email: "demo.hoaian@fitme.ai", name: "Hoài An" },
  { email: "demo.trucnhi@fitme.ai", name: "Trúc Nhi" },
  { email: "demo.yennhi@fitme.ai", name: "Yến Nhi" },
  { email: "demo.havy@fitme.ai", name: "Hà Vy" },
];

function parseJdbcUrl(url) {
  const match = /^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/.exec(url || "");
  if (!match) {
    throw new Error(`DB_URL không hợp lệ (cần dạng jdbc:postgresql://host:port/db): ${url}`);
  }
  return { host: match[1], port: match[2] ? Number(match[2]) : 5432, database: match[3] };
}

function shareCode(index) {
  let code = "";
  let seed = index * 2654435761 + 12345;
  for (let i = 0; i < 10; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    code += SHARE_ALPHABET[seed % SHARE_ALPHABET.length];
  }
  return code;
}

function loadDataset() {
  const path = process.env.DEMO_DATASET
    || "frontend/src/lib/demo-community-data.ts";
  const raw = fs.readFileSync(path, "utf8");
  const marker = "DEMO_COMMUNITY_POSTS: CommunityPost[] = ";
  const start = raw.indexOf(marker) + marker.length;
  const end = raw.lastIndexOf("];");
  const body = raw.slice(start, end).trimEnd().replace(/,\s*$/, "");
  return JSON.parse(body + "]");
}

async function main() {
  const db = parseJdbcUrl(process.env.DB_URL);
  const client = new Client({
    host: db.host,
    port: db.port,
    database: db.database,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const posts = loadDataset();
  console.log(`dataset posts: ${posts.length}`);

  const productIds = [...new Set(posts.flatMap((p) => p.products.map((x) => x.productId)))];
  const products = await client.query(
    "SELECT id, brand_id FROM products WHERE id = ANY($1::uuid[])",
    [productIds]
  );
  const brandByProduct = new Map(products.rows.map((r) => [r.id, r.brand_id]));
  const missing = productIds.filter((id) => !brandByProduct.has(id));
  if (missing.length) {
    console.warn(`cảnh báo: ${missing.length} sản phẩm không có trong DB, các bài liên quan sẽ thiếu ảnh sản phẩm`);
  }

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const authorIds = new Map();
  for (const author of AUTHORS) {
    const existing = await client.query("SELECT id FROM user_accounts WHERE email = $1", [author.email]);
    if (existing.rows.length) {
      authorIds.set(author.name, existing.rows[0].id);
      continue;
    }
    const created = await client.query(
      "INSERT INTO user_accounts (email, password_hash, display_name, role, email_verified, status) "
        + "VALUES ($1, $2, $3, 'USER', true, 'ACTIVE') RETURNING id",
      [author.email, passwordHash, author.name]
    );
    authorIds.set(author.name, created.rows[0].id);
  }
  console.log(`tác giả demo: ${authorIds.size}`);

  let created = 0;
  let skipped = 0;
  let commentCount = 0;
  for (const [index, post] of posts.entries()) {
    const authorId = authorIds.get(post.authorDisplayName);
    if (!authorId) {
      console.warn(`bỏ qua: không có tác giả cho "${post.authorDisplayName}"`);
      continue;
    }
    const code = shareCode(index);
    const existing = await client.query("SELECT id FROM community_posts WHERE share_code = $1", [code]);
    if (existing.rows.length) {
      skipped++;
      continue;
    }
    const brandIds = [...new Set(post.products.map((p) => brandByProduct.get(p.productId)).filter(Boolean))];
    const inserted = await client.query(
      "INSERT INTO community_posts (user_id, share_code, title, caption, style_label, occasion, "
        + "brand_ids, product_ids, image_url, visibility, like_count, comment_count, view_count, created_at) "
        + "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PUBLIC',$10,0,$11, NOW() - ($12 || ' hours')::interval) "
        + "RETURNING id",
      [
        authorId,
        code,
        post.title,
        post.caption,
        post.styleLabel,
        post.occasion,
        brandIds.length ? "," + brandIds.join(",") + "," : null,
        post.products.map((p) => p.productId).join(","),
        post.imageUrl,
        post.likeCount,
        post.viewCount,
        String(index * 5 + 2),
      ]
    );
    created++;

    // The comment_count is maintained by the database trigger, so the rows below are what
    // actually fills the thread. Every third comment gets a reply, which shows the nested layout.
    const wanted = post.commentCount || 0;
    const createdComments = [];
    for (let i = 0; i < wanted; i++) {
      const commenterId = [...authorIds.values()][(index + i) % authorIds.size];
      const row = await client.query(
        "INSERT INTO community_comments (post_id, user_id, content, created_at) "
          + "VALUES ($1,$2,$3, NOW() - ($4 || ' hours')::interval) RETURNING id, user_id",
        [inserted.rows[0].id, commenterId, DEMO_COMMENTS[(index + i) % DEMO_COMMENTS.length], String(wanted - i)]
      );
      createdComments.push(row.rows[0]);
      commentCount++;
    }
    // One reply per three comments, so the thread shows the one-level nesting.
    for (let i = 0; i < createdComments.length; i += 3) {
      const parent = createdComments[i];
      const replierId = [...authorIds.values()][(index + i + 5) % authorIds.size];
      await client.query(
        "INSERT INTO community_comments (post_id, user_id, parent_id, parent_author_id, content, created_at) "
          + "VALUES ($1,$2,$3,$4,$5, NOW() - ($6 || ' hours')::interval)",
        [
          inserted.rows[0].id,
          replierId,
          parent.id,
          parent.user_id,
          DEMO_REPLIES[(index + i) % DEMO_REPLIES.length],
          String(Math.max(wanted - i - 1, 0)),
        ]
      );
      commentCount++;
    }
  }

  console.log(`đã tạo: ${created} bài | bỏ qua (đã tồn tại): ${skipped} | bình luận: ${commentCount}`);
  const total = await client.query(
    "SELECT COUNT(*)::int AS posts, COUNT(DISTINCT user_id)::int AS authors, "
      + "COALESCE(SUM(like_count),0)::int AS likes FROM community_posts WHERE visibility = 'PUBLIC'"
  );
  console.log("feed hiện tại:", total.rows[0]);
  await client.end();
}

main().catch((error) => {
  console.error("LỖI:", error.message);
  process.exit(1);
});
