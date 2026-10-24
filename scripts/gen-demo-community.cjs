const fs = require("fs");

const sel = require("./demo-community-catalog.json").items;
const byI = {};
sel.forEach((p) => (byI[p.i] = p));

const specs = [
  {
    a: "Linh Chi",
    t: "Áo thun oversize + quần jeans rộng",
    cap: "Áo thun Teelab cotton rộng hơn dáng thật nên phối với quần jeans form rộng. Đi học hay đi chơi đều ổn, không quá rườm rà.",
    s: "Korean Casual",
    o: "Đi chơi cuối tuần",
    p: [0, 6, 7],
    l: 47,
    v: 312,
    c: 3,
    h: 5,
  },
  {
    a: "Mai Anh",
    t: null,
    cap: "Hoodie zip DirtyCoins đồ xuống hơn mấy size vẫn đẹp, phối sweatpants đồng bộ nên nhìn như một set.",
    s: "Streetwear",
    o: "Đi chơi cuối tuần",
    p: [14, 17, 18],
    l: 128,
    v: 1180,
    c: 7,
    h: 11,
  },
  {
    a: "Hà My",
    t: "Set nữ tính cho ngày làm",
    cap: "Baby tee crop + quần ống loe. Hẹn bạn đi ăn trưa thì chọn set này, nhìn gọn mà vẫn có dáng.",
    s: "Minimal",
    o: "Đi làm",
    p: [24, 26, 29],
    l: 23,
    v: 264,
    c: 2,
    h: 19,
  },
  {
    a: "Thu Hà",
    t: null,
    cap: "Sơ mi lụa GUMAC + chân váy chữ A công sở, đi giày gót nhọn thì chuẩn công sở luôn.",
    s: "Office Chic",
    o: "Đi làm",
    p: [60, 62, 68],
    l: 312,
    v: 2410,
    c: 11,
    h: 26,
  },
  {
    a: "Minh Thy",
    t: "Blazer cho ngày họp quan trọng",
    cap: "Blazer HAGOO dáng dài, phối quần âu ống đứng và sơ mi trắng. Hơi nặng nhưng nhìn rất xịn.",
    s: "Office Chic",
    o: "Đi làm",
    p: [53, 51, 54],
    l: 89,
    v: 740,
    c: 4,
    h: 33,
  },
  {
    a: "Quỳnh Như",
    t: null,
    cap: "Chân váy xẻ trước dài quá bắp, đi đâu cũng được. Giày đơn giản thôi là đủ.",
    s: "Minimal",
    o: "Đi cafe",
    p: [57, 58],
    l: 64,
    v: 512,
    c: 3,
    h: 41,
  },
  {
    a: "Bảo Châu",
    t: "Đồ xuống cho nữ sinh",
    cap: "Chân váy tennis xếp ly có quần trong nên nhìn xinh mà không sợ lộ. Áo sơ mi cổ sen thì hợp tone.",
    s: "Romantic",
    o: "Đi cafe",
    p: [31, 39],
    l: 156,
    v: 1340,
    c: 9,
    h: 50,
  },
  {
    a: "Ngọc An",
    t: null,
    cap: "Đầm cổ vuông tay ngắn dáng A, mặc lên đi dạo phố mát mà không sợ nắng.",
    s: "Romantic",
    o: "Đi chơi cuối tuần",
    p: [37, 38],
    l: 41,
    v: 388,
    c: 2,
    h: 58,
  },
  {
    a: "Phương Linh",
    t: "Áo len + jeans cho mùa lạnh",
    cap: "Áo len nút màu của Len Clothing, phối quần jeans ống loe. Ảnh hơi tối vì chụp buổi tối nhé.",
    s: "Minimal",
    o: "Đi làm",
    p: [41, 44],
    l: 203,
    v: 1870,
    c: 8,
    h: 66,
  },
  {
    a: "Khánh Vy",
    t: null,
    cap: "Áo thun kẻ sọc dài tay với chân váy mini xếp li, hợp đi chơi lẫn đi làm.",
    s: "Korean Casual",
    o: "Đi làm",
    p: [42, 46],
    l: 37,
    v: 296,
    c: 1,
    h: 74,
  },
  {
    a: "Diệu Linh",
    t: "Windbreaker cho ngày mưa",
    cap: "Áo khoác gió chống nhẹ, mặc thêm quần nỉ thì ấm. Gấp gọn gàng nên cũng tiện mang đi chơi.",
    s: "Sporty",
    o: "Đi du lịch",
    p: [4, 5, 7],
    l: 72,
    v: 604,
    c: 5,
    h: 83,
  },
  {
    a: "Tú Vy",
    t: null,
    cap: "Set đồ nỉ đồng bộ, mặc ở nhà cũng được chứ không xấu hền gì.",
    s: "Sporty",
    o: "Ở nhà",
    p: [20, 22, 27],
    l: 18,
    v: 142,
    c: 1,
    h: 92,
  },
  {
    a: "Thanh Thảo",
    t: "Jersey đáy mùa hè",
    cap: "Áo jersey đáy màu sáng, phối quần jeans baggy. Mùa nắng mặc đồ tối thì nóng nên chọn đồ sáng.",
    s: "Streetwear",
    o: "Đi chơi cuối tuần",
    p: [11, 16],
    l: 95,
    v: 830,
    c: 4,
    h: 101,
  },
  {
    a: "Mộc An",
    t: null,
    cap: "Polo nữ cotton phối quần jeans dáng suông, đơn giản mà vẫn có gu.",
    s: "Minimal",
    o: "Đi cafe",
    p: [64, 66],
    l: 58,
    v: 472,
    c: 2,
    h: 110,
  },
  {
    a: "Hoài An",
    t: "Đầm cho ngày đặc biệt",
    cap: "Đầm chữ A phối nơ cổ, đi ăn mừng sinh nhật là vừa. Thắt eo một chút cho xinh hơn.",
    s: "Romantic",
    o: "Dự tiệc",
    p: [63, 68],
    l: 246,
    v: 2120,
    c: 12,
    h: 118,
  },
  {
    a: "Trúc Nhi",
    t: null,
    cap: "Sweater thêu ngôi sao ấm áp, phối quần short jeans ống rộng cho mùa thu.",
    s: "Korean Casual",
    o: "Đi cafe",
    p: [48, 43],
    l: 29,
    v: 198,
    c: 1,
    h: 127,
  },
  {
    a: "Yến Nhi",
    t: "Set thể thao nhẹ",
    cap: "Áo thun dài tay + quần short bí, mặc đi tập hoặc đi chơi đều tiện.",
    s: "Sporty",
    o: "Tập gym",
    p: [25, 27],
    l: 87,
    v: 760,
    c: 3,
    h: 136,
  },
  {
    a: "Hà Vy",
    t: null,
    cap: "Cardigan len dài phối quần shorts nỉ, mùa thu thì vừa đủ ấm.",
    s: "Korean Casual",
    o: "Đi chơi cuối tuần",
    p: [3, 8],
    l: 134,
    v: 1080,
    c: 6,
    h: 145,
  },
];

const now = Date.now();
const posts = specs.map((sp, k) => {
  const ps = sp.p.map((i) => byI[i]);
  const code = `demo${String(k + 1).padStart(6, "0")}`;
  return {
    id: `demo-post-${k + 1}`,
    shareCode: code,
    shareUrl: `/outfit/${code}`,
    title: sp.t,
    caption: sp.cap,
    styleLabel: sp.s,
    occasion: sp.o,
    imageUrl: ps[0].img,
    authorDisplayName: sp.a,
    authorInitials: sp.a
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
    brandNames: [...new Set(ps.map((p) => p.brand))],
    products: ps.map((p) => ({
      productId: p.id,
      name: p.name,
      imageUrl: p.img,
      price: p.price,
    })),
    likeCount: sp.l,
    commentCount: sp.c,
    viewCount: sp.v,
    likedByMe: false,
    savedByMe: false,
    mine: false,
    createdAt: new Date(now - sp.h * 3600 * 1000).toISOString(),
  };
});

const header = `/**
 * Demo community feed.
 *
 * Every image and product here is a real catalog item (public R2 object), so the feed shows
 * genuine product photography instead of placeholder art. Captions are written as short, plain
 * Vietnamese notes a shopper would actually write — no marketing filler.
 *
 * Generated by \`scripts/gen-demo-community.cjs\`; regenerate instead of hand-editing.
 */
import type { CommunityPost } from "@/types";

export const DEMO_COMMUNITY_POSTS: CommunityPost[] = `;

fs.writeFileSync(
  "frontend/src/lib/demo-community-data.ts",
  `${header}${JSON.stringify(posts, null, 2)};\n`,
  "utf8",
);
console.log("wrote frontend/src/lib/demo-community-data.ts", posts.length);
