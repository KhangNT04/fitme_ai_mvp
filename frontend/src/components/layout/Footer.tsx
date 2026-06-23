import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-stone-900">FitMe AI</h3>
            <p className="mt-2 text-sm text-stone-500">
              Tư vấn size & phối đồ bằng AI. Preview outfit 2D minh họa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Khám phá</h4>
            <ul className="mt-2 space-y-2 text-sm text-stone-500">
              <li><Link href="/discover" className="hover:text-stone-900">Sản phẩm</Link></li>
              <li><Link href="/ai/start" className="hover:text-stone-900">Tư vấn AI</Link></li>
              <li><Link href="/try-on" className="hover:text-stone-900">Thử mặc AI</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Đối tác</h4>
            <ul className="mt-2 space-y-2 text-sm text-stone-500">
              <li><Link href="/brand/login" className="hover:text-stone-900">Brand Portal</Link></li>
              <li><Link href="/admin/login" className="hover:text-stone-900">Admin</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} FitMe AI. “Đúng size, hợp dáng, chuẩn màu — thử trước khi mua.”.
        </p>
      </div>
    </footer>
  );
}
