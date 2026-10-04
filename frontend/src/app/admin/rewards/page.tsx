"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApi,
  type ShareClaim,
  type ShareClaimStatus,
} from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { portalFormCardClass, portalTableActionsClass } from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: "" | ShareClaimStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
];

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function AdminRewardsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | ShareClaimStatus>("");
  const [rejectTarget, setRejectTarget] = useState<ShareClaim | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [fitkenUserId, setFitkenUserId] = useState("");
  const [fitkenDelta, setFitkenDelta] = useState(0);
  const [fitkenNote, setFitkenNote] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-share-claims", statusFilter],
    queryFn: () =>
      adminApi.listShareClaims(statusFilter === "" ? undefined : statusFilter),
  });

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      adminApi.rejectShareClaim(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-share-claims"] });
      setRejectTarget(null);
      setRejectNote("");
      actionFeedback({ successMessage: "Đã từ chối và thu hồi thưởng (nếu có)" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể từ chối yêu cầu" }).onError,
  });

  const fitkenAdjust = useMutation({
    mutationFn: () =>
      adminApi.adjustConsumerFitken(fitkenUserId.trim(), {
        delta: fitkenDelta,
        note: fitkenNote || undefined,
      }),
    onSuccess: (detail) => {
      actionFeedback({
        successMessage: `Số dư Fitken mới: ${detail.wallet.balance}`,
      }).onSuccess();
      setFitkenDelta(0);
      setFitkenNote("");
    },
    onError: actionFeedback({ errorMessage: "Không thể điều chỉnh Fitken" }).onError,
  });

  const openReject = (claim: ShareClaim) => {
    setRejectTarget(claim);
    setRejectNote("");
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    reject.mutate({ id: rejectTarget.id, note: rejectNote.trim() || undefined });
  };

  return (
    <PortalAdminPage
      title="Duyệt chia sẻ"
      description="Theo dõi yêu cầu nhận thưởng khi người dùng chia sẻ bài đăng. Từ chối sẽ thu hồi Fitken đã cộng."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có yêu cầu chia sẻ"
      emptyDescription="Khi người dùng gửi link bài đăng hợp lệ, bản ghi sẽ hiển thị tại đây."
    >
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="share-status">Lọc trạng thái</Label>
          <select
            id="share-status"
            className="flex h-10 min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | ShareClaimStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form
        className={cn(portalFormCardClass, "mb-8")}
        onSubmit={(e) => {
          e.preventDefault();
          if (!fitkenUserId.trim()) return;
          fitkenAdjust.mutate();
        }}
      >
        <h2 className="font-display text-base font-semibold">Điều chỉnh Fitken</h2>
        <p className="text-sm text-muted-foreground">
          Nhập UUID người dùng, delta (+ cộng / − trừ) và ghi chú nội bộ.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="fitken-user">User ID</Label>
            <Input
              id="fitken-user"
              value={fitkenUserId}
              onChange={(e) => setFitkenUserId(e.target.value)}
              placeholder="UUID người dùng"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fitken-delta">Delta</Label>
            <Input
              id="fitken-delta"
              type="number"
              value={fitkenDelta}
              onChange={(e) => setFitkenDelta(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fitken-note">Ghi chú</Label>
            <Input
              id="fitken-note"
              value={fitkenNote}
              onChange={(e) => setFitkenNote(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          className="mt-4"
          disabled={fitkenAdjust.isPending || !fitkenUserId.trim() || fitkenDelta === 0}
        >
          {fitkenAdjust.isPending ? "Đang xử lý..." : "Áp dụng"}
        </Button>
      </form>

      {data && data.length > 0 && (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Thời gian</th>
              <th className={portalTableThClass}>Nền tảng</th>
              <th className={portalTableThClass}>Link</th>
              <th className={portalTableThClass}>User</th>
              <th className={portalTableThClass}>Thưởng</th>
              <th className={portalTableThClass}>Trạng thái</th>
              <th className={portalTableThClass}>Thao tác</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {data.map((claim) => (
              <tr key={claim.id}>
                <td className={portalTableTdClass}>{formatWhen(claim.createdAt)}</td>
                <td className={portalTableTdClass}>{claim.platform}</td>
                <td className={cn(portalTableTdClass, "max-w-xs")}>
                  <a
                    href={claim.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary underline-offset-2 hover:underline"
                  >
                    Mở link
                  </a>
                </td>
                <td className={cn(portalTableTdClass, "font-mono text-xs")}>{claim.userId}</td>
                <td className={portalTableTdClass}>+{claim.rewardGranted} Fitken</td>
                <td className={portalTableTdClass}>
                  <Badge variant="outline">{claim.status}</Badge>
                </td>
                <td className={portalTableTdClass}>
                  <PortalActionGroup className={portalTableActionsClass}>
                    {claim.status === "APPROVED" && (
                      <PortalActionButton variant="reject" onClick={() => openReject(claim)}>
                        Từ chối
                      </PortalActionButton>
                    )}
                  </PortalActionGroup>
                </td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu chia sẻ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hệ thống sẽ đánh dấu REJECTED và thu hồi Fitken thưởng (không để số dư âm).
          </p>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Ghi chú (tuỳ chọn)</Label>
            <Input
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Lý do từ chối..."
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Huỷ
            </Button>
            <Button type="button" variant="destructive" disabled={reject.isPending} onClick={confirmReject}>
              {reject.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalAdminPage>
  );
}
