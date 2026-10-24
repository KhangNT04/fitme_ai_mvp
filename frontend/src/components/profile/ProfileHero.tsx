"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { authApi } from "@/services/auth-api";
import { PROFILE_SUMMARY_QUERY_KEY } from "@/services/profile-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserErrorMessage } from "@/lib/user-error-message";
import type { UserRole } from "@/types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Người dùng",
  BRAND: "Thương hiệu",
  ADMIN: "Quản trị",
};

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * The profile header. The display name is editable inline so the user does not have to leave
 * the page to fix a typo in their public name.
 */
export function ProfileHero({
  email,
  displayName,
  role,
  fitkenBalance,
  bodyBadge,
}: {
  email?: string | null;
  displayName?: string | null;
  role?: UserRole;
  fitkenBalance?: number;
  bodyBadge?: string | null;
}) {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");

  const renameMutation = useMutation({
    mutationFn: async () => {
      const session = await authApi.updateDisplayName(draft.trim());
      if (accessToken && refreshToken) {
        await setAuth(session.user, session.accessToken, session.refreshToken);
      } else {
        useAuthStore.setState({ user: session.user });
      }
    },
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: PROFILE_SUMMARY_QUERY_KEY });
      toast.success("Đã cập nhật tên hiển thị");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không thể cập nhật tên hiển thị.")),
  });

  const startEditing = () => {
    setDraft(displayName ?? "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(displayName ?? "");
    setEditing(false);
  };

  return (
    <section className="surface-card relative overflow-hidden rounded-xl p-3 sm:rounded-2xl sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl sm:h-32 sm:w-32" />
      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="gradient-ai flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-md sm:h-16 sm:w-16 sm:rounded-2xl sm:text-xl">
          {getInitials(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={80}
                autoFocus
                aria-label="Tên hiển thị"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) renameMutation.mutate();
                  if (e.key === "Escape") cancelEditing();
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Lưu tên hiển thị"
                disabled={!draft.trim() || renameMutation.isPending}
                onClick={() => renameMutation.mutate()}
              >
                {renameMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Huỷ chỉnh sửa tên"
                onClick={cancelEditing}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h2 className="truncate font-display text-base font-bold text-foreground sm:text-xl">
                {displayName ?? "Người dùng FitMe"}
              </h2>
              <button
                type="button"
                onClick={startEditing}
                aria-label="Sửa tên hiển thị"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
            <Badge variant="secondary" className="px-2 py-0 text-[10px] sm:text-xs">
              {role ? ROLE_LABELS[role] : "Người dùng"}
            </Badge>
            {typeof fitkenBalance === "number" && (
              <Badge
                variant="default"
                className="bg-amber-500 px-2 py-0 text-[10px] text-white hover:bg-amber-600 sm:text-xs"
              >
                {fitkenBalance} Fitken
              </Badge>
            )}
            {bodyBadge && (
              <Badge variant="outline" className="px-2 py-0 text-[10px] sm:text-xs">
                {bodyBadge}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
