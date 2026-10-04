"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApi,
  type AdminReviewItem,
  type ReviewStatus,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { portalTableActionsClass } from "@/lib/design-tokens";
import { actionFeedback } from "@/lib/action-feedback";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: "" | ReviewStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "VISIBLE", label: "Đang hiển thị" },
  { value: "HIDDEN", label: "Đã ẩn" },
];

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | ReviewStatus>("");
  const [hideTarget, setHideTarget] = useState<AdminReviewItem | null>(null);
  const [hideNote, setHideNote] = useState("");
  const [revokeReward, setRevokeReward] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: () =>
      adminApi.listAdminReviews(statusFilter === "" ? undefined : statusFilter),
  });

  const hide = useMutation({
    mutationFn: ({
      id,
      note,
      revokeReward: revoke,
    }: {
      id: string;
      note?: string;
      revokeReward?: boolean;
    }) => adminApi.hideReview(id, { note, revokeReward: revoke }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setHideTarget(null);
      setHideNote("");
      setRevokeReward(false);
      actionFeedback({ successMessage: "Đã ẩn đánh giá" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể ẩn đánh giá" }).onError,
  });

  const openHide = (review: AdminReviewItem) => {
    setHideTarget(review);
    setHideNote("");
    setRevokeReward(false);
  };

  const confirmHide = () => {
    if (!hideTarget) return;
    hide.mutate({
      id: hideTarget.id,
      note: hideNote.trim() || undefined,
      revokeReward,
    });
  };

  return (
    <PortalAdminPage
      title="Đánh giá sản phẩm"
      description="Kiểm duyệt đánh giá có ảnh của người dùng. Ẩn nội dung vi phạm; có thể thu hồi thưởng Fitken."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có đánh giá"
      emptyDescription="Đánh giá mới sẽ xuất hiện khi người dùng gửi từ trang sản phẩm."
    >
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="review-status">Lọc trạng thái</Label>
          <select
            id="review-status"
            className="flex h-10 min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | ReviewStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data && data.length > 0 && (
        <PortalDataTable showOnMobile>
          <PortalDataTableHead>
            <tr>
              <th className={portalTableThClass}>Thời gian</th>
              <th className={portalTableThClass}>Ảnh</th>
              <th className={portalTableThClass}>Sao</th>
              <th className={portalTableThClass}>Nội dung</th>
              <th className={portalTableThClass}>Tác giả</th>
              <th className={portalTableThClass}>Thưởng</th>
              <th className={portalTableThClass}>Trạng thái</th>
              <th className={portalTableThClass}>Thao tác</th>
            </tr>
          </PortalDataTableHead>
          <PortalDataTableBody>
            {data.map((review) => (
              <tr key={review.id}>
                <td className={portalTableTdClass}>{formatWhen(review.createdAt)}</td>
                <td className={portalTableTdClass}>
                  <div className="flex flex-wrap gap-1">
                    {review.imageUrls.slice(0, 3).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-10 w-10 rounded-md border border-border object-cover"
                        />
                      </a>
                    ))}
                    {review.imageUrls.length === 0 && "—"}
                  </div>
                </td>
                <td className={portalTableTdClass}>{review.rating}/5</td>
                <td className={cn(portalTableTdClass, "max-w-xs truncate")}>{review.content}</td>
                <td className={portalTableTdClass}>
                  {review.authorName}
                  {review.verifiedPurchase && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      Đã mua
                    </Badge>
                  )}
                </td>
                <td className={portalTableTdClass}>
                  {review.rewardGranted > 0 ? `+${review.rewardGranted}` : "—"}
                </td>
                <td className={portalTableTdClass}>
                  <Badge variant="outline">{review.status}</Badge>
                </td>
                <td className={portalTableTdClass}>
                  <PortalActionGroup className={portalTableActionsClass}>
                    {review.status === "VISIBLE" && (
                      <PortalActionButton variant="reject" onClick={() => openHide(review)}>
                        Ẩn
                      </PortalActionButton>
                    )}
                  </PortalActionGroup>
                </td>
              </tr>
            ))}
          </PortalDataTableBody>
        </PortalDataTable>
      )}

      <Dialog open={!!hideTarget} onOpenChange={(open) => !open && setHideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ẩn đánh giá này?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Đánh giá sẽ không còn hiển thị công khai trên sản phẩm.
          </p>
          <div className="space-y-2">
            <Label htmlFor="hide-note">Ghi chú nội bộ (tuỳ chọn)</Label>
            <Input
              id="hide-note"
              value={hideNote}
              onChange={(e) => setHideNote(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={revokeReward}
              onCheckedChange={(checked) => setRevokeReward(checked === true)}
            />
            Thu hồi thưởng Fitken đã cộng
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setHideTarget(null)}>
              Huỷ
            </Button>
            <Button type="button" variant="destructive" disabled={hide.isPending} onClick={confirmHide}>
              {hide.isPending ? "Đang xử lý..." : "Xác nhận ẩn"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalAdminPage>
  );
}
