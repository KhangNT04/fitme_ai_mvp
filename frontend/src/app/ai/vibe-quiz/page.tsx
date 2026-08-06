"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useConsultationStore } from "@/stores/consultation-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { profileApi } from "@/services/profile-api";
import { BUDGET_BANDS, CLOSET_GOAL_OPTIONS } from "@/utils/constants";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { STYLIST_STARTER_PENDING_KEY } from "@/types/stylist-chat";

export default function VibeQuizPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const setBodyProfile = useConsultationStore((s) => s.setBodyProfile);
  const draftBody = useConsultationStore((s) => s.draft.bodyProfile);
  const clearChat = useStylistChatStore((s) => s.clearChat);
  const [budget, setBudget] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const onContinue = async () => {
    setSaving(true);
    try {
      await ensureSession();

      const nextGoals = [...goals];
      if (budget) nextGoals.push(`budget:${budget}`);

      if (draftBody) {
        const nextBody = { ...draftBody, goals: nextGoals };
        setBodyProfile(nextBody);
        try {
          await profileApi.saveBodyProfile(nextBody);
        } catch {
          // Best-effort; consultation store still has the goals for this session.
        }
      }

      clearChat();
      sessionStorage.setItem(STYLIST_STARTER_PENDING_KEY, "1");
      router.push("/ai/chat");
    } catch (e) {
      toast.error(getUserErrorMessage(e, "Không lưu được thông tin. Thử lại nhé."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        title="Thêm chút cá nhân hóa"
        subtitle="Chỉ ~10 giây — outfit gợi ý sẽ hợp túi tiền và mục tiêu hơn"
        backHref="/ai/body-profile"
        backLabel="Hồ sơ"
        steps={AI_FLOW_STEPS}
        currentStep={2}
      />

      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
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
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            className="min-h-11 flex-1 rounded-full sm:flex-none sm:px-8"
            disabled={saving}
            onClick={() => void onContinue()}
          >
            {saving ? "Đang lưu…" : "Xong — vào tư vấn"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full sm:px-6"
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
