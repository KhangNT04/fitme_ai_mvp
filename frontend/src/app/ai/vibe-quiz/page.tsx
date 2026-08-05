"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useConsultationStore } from "@/stores/consultation-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { profileApi } from "@/services/profile-api";
import {
  BUDGET_BANDS,
  CLOSET_GOAL_OPTIONS,
  VIBE_QUIZ_OPTIONS,
} from "@/utils/constants";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { STYLIST_STARTER_PENDING_KEY } from "@/types/stylist-chat";
import { cn } from "@/lib/utils";

export default function VibeQuizPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const setStyleProfile = useConsultationStore((s) => s.setStyleProfile);
  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);
  const draftBody = useConsultationStore((s) => s.draft.bodyProfile);
  const clearChat = useStylistChatStore((s) => s.clearChat);
  const [vibeId, setVibeId] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const onContinue = async () => {
    const vibe = VIBE_QUIZ_OPTIONS.find((v) => v.id === vibeId);
    if (!vibe) {
      toast.error("Chọn một vibe gần bạn nhất nhé — chỉ mất vài giây.");
      return;
    }
    setSaving(true);
    try {
      await ensureSession();
      const style = {
        primaryStyle: vibe.style,
        riskLevel: vibe.riskLevel,
      };
      setStyleProfile(style);

      const nextGoals = [...goals];
      if (budget) nextGoals.push(`budget:${budget}`);
      nextGoals.push(`mood:${vibe.mood}`);

      if (draftBody) {
        const nextBody = { ...draftBody, goals: nextGoals };
        setBodyProfile(nextBody);
        try {
          await profileApi.saveBodyProfile(nextBody);
        } catch {
          // Style save is enough to continue; body goals are best-effort.
        }
      }

      try {
        await profileApi.saveStyleProfile(style);
      } catch {
        // Guest may not persist style; consultation store still has it.
      }

      clearChat();
      sessionStorage.setItem(STYLIST_STARTER_PENDING_KEY, "1");
      router.push("/ai/chat");
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không lưu được vibe. Thử lại nhé."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        title="Chọn vibe của bạn"
        subtitle="Chỉ ~20 giây — outfit sẽ chuẩn hơn rõ"
        backHref="/ai/body-profile"
        backLabel="Hồ sơ"
        steps={AI_FLOW_STEPS}
        currentStep={2}
      />

      <div className="mx-auto max-w-lg space-y-8 pb-10">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Vibe gần bạn nhất</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {VIBE_QUIZ_OPTIONS.map((opt) => {
              const selected = vibeId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVibeId(opt.id)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    selected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background hover:border-primary/40",
                  )}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{opt.hint}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ngân sách mua thêm</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Giúp stylist gợi ý món vừa túi — chọn 1 mức (tùy chọn)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {BUDGET_BANDS.map((b) => (
              <Chip key={b.value} selected={budget === b.value} onClick={() => setBudget(b.value)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mục tiêu tủ đồ</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tủ đồ muốn đi hướng nào thêm? (chọn nhiều, tùy chọn)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CLOSET_GOAL_OPTIONS.map((g) => (
              <Chip key={g} selected={goals.includes(g)} onClick={() => toggleGoal(g)}>
                {g}
              </Chip>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="min-h-11 flex-1 rounded-full"
            disabled={saving || !vibeId}
            onClick={() => void onContinue()}
          >
            {saving ? "Đang lưu…" : "Xong — vào tư vấn"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            disabled={saving}
            onClick={() => {
              sessionStorage.setItem(STYLIST_STARTER_PENDING_KEY, "1");
              router.push("/ai/chat");
            }}
          >
            Bỏ qua
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
