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
import { useConsumerStoresReady } from "@/hooks/use-consumer-stores-ready";
import { useAuthStore } from "@/stores/auth-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useStylistChatStore } from "@/stores/stylist-chat-store";
import { stylistChatApi } from "@/services/stylist-chat-api";
import type { ApiError } from "@/services/api-client";
import { ensureServerBodyProfile } from "@/lib/ensure-server-body-profile";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import type { StylistChatMessage } from "@/types/stylist-chat";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assistantErrorMessage(error: unknown): string {
  const status = (error as ApiError)?.status;
  if (status === 400) {
    return "Mình cần hồ sơ cơ thể trước khi gợi ý outfit. Vui lòng quay lại bước Hồ sơ và lưu lại nhé.";
  }
  if (status === 401 || status === 403) {
    return "Phiên làm việc hết hạn. Tải lại trang hoặc lưu lại hồ sơ cơ thể rồi thử gửi tin nhắn lần nữa.";
  }
  return "Xin lỗi, mình chưa xử lý được yêu cầu này. Bạn thử mô tả lại outfit mong muốn nhé.";
}

export default function AiChatPage() {
  const router = useRouter();
  const storesReady = useConsumerStoresReady();
  const { ensureSession } = useEnsureSession();
  const { ready, isLoading, profile, refreshGuest } = useBodyProfileReady();
  const selectedProductId = useConsultationStore((s) => s.draft.selectedProductId);
  const messages = useStylistChatStore((s) => s.messages);
  const conversationId = useStylistChatStore((s) => s.conversationId);
  const addMessage = useStylistChatStore((s) => s.addMessage);
  const setConversationId = useStylistChatStore((s) => s.setConversationId);
  const [sending, setSending] = useState(false);
  const [chatHydrated, setChatHydrated] = useState(false);

  useEffect(() => {
    void Promise.resolve(useStylistChatStore.persist.rehydrate()).finally(() => setChatHydrated(true));
  }, []);

  useEffect(() => {
    if (!storesReady) return;
    void ensureSession();
  }, [ensureSession, storesReady]);

  useEffect(() => {
    if (!storesReady || isLoading || !ready || !profile) return;
    void ensureSession()
      .then(() => ensureServerBodyProfile(profile))
      .catch(() => {
        // Best-effort warm-up; send() retries before chat API.
      });
  }, [storesReady, isLoading, ready, profile, ensureSession]);

  useEffect(() => {
    if (!storesReady || isLoading) return;
    if (!ready) {
      router.replace("/ai/body-profile?required=1");
    }
  }, [storesReady, isLoading, ready, router]);

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
        await ensureServerBodyProfile(profile);
        const history = useStylistChatStore
          .getState()
          .messages.filter((m) => m.type === "text" || m.type === "off_topic")
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const authenticated = useAuthStore.getState().isAuthenticated();
        const result = await stylistChatApi.sendMessage({
          message: text,
          conversationId: authenticated ? conversationId : undefined,
          history: authenticated ? undefined : history,
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
          content: assistantErrorMessage(e),
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
      profile,
      conversationId,
      selectedProductId,
      setConversationId,
      refreshGuest,
    ],
  );

  if (!storesReady || isLoading || !chatHydrated || !ready) {
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
