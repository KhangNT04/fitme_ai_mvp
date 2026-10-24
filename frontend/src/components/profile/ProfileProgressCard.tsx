"use client";

import Link from "next/link";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileChecklist, profileCompletionPercent } from "@/lib/profile-progress";
import { cn } from "@/lib/utils";
import type { ProfileSummary } from "@/types/profile";

/**
 * The profile completion card: a progress bar plus the checklist of what is still missing.
 * The next unfinished step is highlighted so the user always knows where to go next.
 */
export function ProfileProgressCard({
  summary,
  className,
}: {
  summary: ProfileSummary;
  className?: string;
}) {
  const steps = profileChecklist(summary);
  const percent = profileCompletionPercent(summary);
  const next = steps.find((step) => !step.done);

  return (
    <section className={cn("surface-card rounded-xl p-3 sm:rounded-2xl sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold text-foreground sm:text-base">
            Hoàn thiện hồ sơ
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {percent === 100
              ? "Hồ sơ đã đầy đủ — tư vấn AI sẽ chính xác hơn!"
              : `Còn ${steps.filter((step) => !step.done).length} bước để gợi ý chính xác hơn.`}
          </p>
        </div>
        <span className="shrink-0 font-display text-lg font-bold text-primary">{percent}%</span>
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Mức độ hoàn thiện hồ sơ"
      >
        <div
          className="gradient-ai h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {next && (
        <Button asChild size="sm" className="mt-3 w-full rounded-full" variant="ai">
          <Link href={next.href}>
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {next.cta}: {next.label}
          </Link>
        </Button>
      )}

      <ul className="mt-3 space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted",
                next?.key === step.key && "bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  step.done
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                    : "border-dashed border-border text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px]">•</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-xs font-medium sm:text-sm",
                    step.done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground sm:text-xs">
                  {step.description}
                </span>
              </span>
              {!step.done && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
