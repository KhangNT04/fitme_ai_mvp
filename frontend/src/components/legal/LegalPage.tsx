import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { consumerPageShellClass } from "@/lib/design-tokens";

export function LegalPage({
  title,
  subtitle,
  updatedAt,
  children,
}: {
  title: string;
  subtitle?: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <PageShell width="medium" className={consumerPageShellClass}>
      <CollapsingPageHeader title={title} subtitle={subtitle} backHref="/" backLabel="Trang chủ" />
      <article className="space-y-6 rounded-2xl border border-border/60 bg-white/90 p-5 text-sm leading-relaxed text-foreground sm:p-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_ul]:space-y-1.5">
        {updatedAt && <p className="text-xs">Cập nhật lần cuối: {updatedAt}</p>}
        {children}
      </article>
    </PageShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
