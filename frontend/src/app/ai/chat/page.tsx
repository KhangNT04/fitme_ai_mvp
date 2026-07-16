"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ChatMessageList } from "@/components/stylist-chat/ChatMessageList";
import { ChatComposer } from "@/components/stylist-chat/ChatComposer";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useBodyProfileReady } from "@/hooks/use-body-profile-ready";
import { useAuthStore } from "@/stores/auth-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { profileApi } from "@/services/profile-api";
import { stylistChatApi } from "@/services/stylist-chat-api";
import { getGuestBodyProfile } from "@/lib/local-profile-storage";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import type { StylistChatMessage } from "@/types/stylist-chat";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AiChatPage() {
  const router = useRouter();
  const { ensureSession } = useEnsureSession();
  const { ready, isLoading, profile, isAuthenticated, refreshGuest } = useBodyProfileReady();
  const selectedProductId = useConsultationStore((s) => s.draft.selectedProductId);
  const messages = useStylistChatStore((s) => s.messages);
  const conversationId = useStylistChatStore((s) => s.conversationId);
  const addMessage = useStylistChatStore((s) => s.addMessage);
  const setConversationId = useStylistChatStore((s) => s.setConversationId);
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void Promise.resolve(useStylistChatStore.persist.rehydrate()).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (isLoading) return;
    if (!ready) {
      router.replace("/ai/body-profile?required=1");
    }
  }, [isLoading, ready, router]);

  const syncGuestProfileIfNeeded = useCallback(async () => {
    if (isAuthenticated) return;
    const guest = getGuestBodyProfile() ?? profile;
    if (!guest) return;
    await profileApi.saveBodyProfile(guest);
  }, [isAuthenticated, profile]);

  const send = useCallback(
    async (text: string) => {
      if (sending) return;
      const userMsg: StylistChatMessage = {
        id: newId(),
        role: "user",
        type: "text",
        content: text,
        createdAt: Date.now(),
      };
      addMessage(userMsg);
      setSending(true);
      try {
        await ensureSession();
        await syncGuestProfileIfNeeded();
        const history = useStylistChatStore
          .getState()
          .messages.filter((m) => m.type === "text" || m.type === "off_topic")
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const result = await stylistChatApi.sendMessage({
          message: text,
          conversationId: useAuthStore.getState().isAuthenticated()
            ? conversationId
            : undefined,
          history: useAuthStore.getState().isAuthenticated() ? undefined : history,
          selectedProductId,
        });

        if (result.conversationId) {
          setConversationId(result.conversationId);
        }

        const assistantMsg: StylistChatMessage = {
          id: newId(),
          role: "assistant",
          type: result.type,
          content: result.content,
          createdAt: Date.now(),
          requestId: result.requestId,
          options: result.options,
          recommendations: result.recommendations,
          conversationId: result.conversationId,
        };
        addMessage(assistantMsg);
      } catch (e) {
        toast.error(getUserErrorMessage(e, "Không gửi được tin nhắn. Thử lại nhé."));
        addMessage({
          id: newId(),
          role: "assistant",
          type: "text",
          content: "Xin lỗi, mình chưa xử lý được yêu cầu này. Bạn thử mô tả lại outfit mong muốn nhé.",
          createdAt: Date.now(),
        });
      } finally {
        setSending(false);
        refreshGuest();
      }
    },
    [
      sending,
      addMessage,
      ensureSession,
      syncGuestProfileIfNeeded,
      conversationId,
      selectedProductId,
      setConversationId,
      refreshGuest,
    ],
  );

  if (isLoading || !hydrated || !ready) {
    return (
      <PageShell width="full" className={consumerPageShellClass}>
        <LoadingSkeleton className="h-64" />
      </PageShell>
    );
  }

  const showWelcome = messages.length === 0;

  return (
    <PageShell width="full" className={`${consumerPageShellClass} flex min-h-[70vh] flex-col`}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={2}
        title="Tư vấn outfit AI"
        subtitle="Chat với stylist — mô tả vibe, dịp mặc, nhận gợi ý ngay trong khung chat"
        showAiBadge
        backHref="/ai/body-profile"
        backLabel="Hồ sơ"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ChatMessageList
          messages={messages}
          showWelcome={showWelcome}
          onQuickPrompt={(p) => void send(p)}
          quickPromptsDisabled={sending}
        />
        {sending && (
          <p className="text-center text-xs text-muted-foreground">Stylist đang phối đồ…</p>
        )}
        <ChatComposer onSend={(m) => void send(m)} disabled={!ready} sending={sending} />
      </div>
    </PageShell>
  );
}
