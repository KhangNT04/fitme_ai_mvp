/**
 * Fills the demo posts' comment threads with real rows.
 *
 * The first version of the seed wrote a static `comment_count` without any rows behind it, so the
 * feed advertised "3 bình luận" while the thread opened empty. This script creates the missing
 * rows for posts that have no comments yet and lets the database trigger fix the counters.
 *
 * Safe to re-run: posts that already have comments are left alone.
 */
const fs = require("fs");
const { Client } = require("pg");

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

function parseJdbcUrl(url) {
  const match = /^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/.exec(url || "");
  if (!match) {
    throw new Error(`DB_URL không hợp lệ: ${url}`);
  }
  return { host: match[1], port: match[2] ? Number(match[2]) : 5432, database: match[3] };
}

const SHARE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** The same deterministic code the post seed uses, so a dataset entry maps to exactly one post. */
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
  const path = process.env.DEMO_DATASET || "frontend/src/lib/demo-community-data.ts";
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
  // Map share code -> the comment count the curated dataset states for that post.
  const wantedByCode = new Map(posts.map((post, index) => [shareCode(index), post.commentCount || 0]));

  const authors = await client.query(
    "SELECT id FROM user_accounts WHERE email LIKE 'demo.%@fitme.ai' ORDER BY email"
  );
  const authorIds = authors.rows.map((r) => r.id);
  if (!authorIds.length) {
    throw new Error("Không tìm thấy tài khoản demo. Chạy seed-community-posts.cjs trước.");
  }
  console.log(`tài khoản demo: ${authorIds.length}`);

  const rows = await client.query(
    "SELECT p.id, p.share_code, p.created_at, "
      + "(SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id) AS existing "
      + "FROM community_posts p WHERE p.visibility = 'PUBLIC' ORDER BY p.created_at"
  );

  let added = 0;
  for (const [index, row] of rows.rows.entries()) {
    if (row.existing > 0) continue;
    const wanted = wantedByCode.get(row.share_code) ?? 3;
    if (!wanted) continue;

    const created = [];
    for (let i = 0; i < wanted; i++) {
      const commenterId = authorIds[(index + i) % authorIds.length];
      const inserted = await client.query(
        "INSERT INTO community_comments (post_id, user_id, content, created_at) "
          + "VALUES ($1,$2,$3, $4::timestamptz - ($5 || ' hours')::interval) RETURNING id, user_id",
        [row.id, commenterId, DEMO_COMMENTS[(index + i) % DEMO_COMMENTS.length], row.created_at, String(wanted - i)]
      );
      created.push(inserted.rows[0]);
      added++;
    }
    for (let i = 0; i < created.length; i += 3) {
      const parent = created[i];
      const replierId = authorIds[(index + i + 5) % authorIds.length];
      await client.query(
        "INSERT INTO community_comments (post_id, user_id, parent_id, parent_author_id, content, created_at) "
          + "VALUES ($1,$2,$3,$4,$5, $6::timestamptz - ($7 || ' hours')::interval)",
        [
          row.id,
          replierId,
          parent.id,
          parent.user_id,
          DEMO_REPLIES[(index + i) % DEMO_REPLIES.length],
          row.created_at,
          String(Math.max(wanted - i - 1, 0)),
        ]
      );
      added++;
    }
  }

  console.log(`đã thêm ${added} bình luận`);
  const total = await client.query(
    "SELECT COUNT(*)::int AS comments FROM community_comments"
  );
  console.log("tổng bình luận:", total.rows[0].comments);
  await client.end();
}

main().catch((error) => {
  console.error("LỖI:", error.message);
  process.exit(1);
});
