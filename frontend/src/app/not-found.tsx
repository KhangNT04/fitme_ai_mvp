import Link from "next/link";
import { SearchX } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { consumerPageShellClass, pageSubtitle, pageTitle } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center sm:py-24">
        <SearchX className="mb-4 h-12 w-12 text-muted-foreground/60" aria-hidden="true" />
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className={cn(pageTitle, "mt-2")}>Không tìm thấy trang</h1>
        <p className={cn(pageSubtitle, "max-w-md")}>
          Trang bạn tìm có thể đã bị xóa, đổi địa chỉ hoặc chưa từng tồn tại.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="rounded-full">
            <Link href="/">Về trang chủ</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/discover">Khám phá sản phẩm</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
