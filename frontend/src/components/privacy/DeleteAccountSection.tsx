"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Trash2, Undo2 } from "lucide-react";
import {
  ACCOUNT_DELETION_QUERY_KEY,
  accountDeletionApi,
  type AccountDeletionStatus,
} from "@/services/privacy-api";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUserErrorMessage } from "@/lib/user-error-message";

/** Cụm người dùng phải gõ đúng để xác nhận — tránh xoá nhầm tài khoản. */
export const DELETE_CONFIRMATION_PHRASE = "XOA TAI KHOAN";

const GRACE_PERIOD_OPTIONS = [
  { value: 0, label: "Xoá ngay" },
  { value: 3, label: "3 ngày" },
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
];

function formatScheduledDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Phần cảnh báo + nút huỷ, hiện khi đã có yêu cầu xoá đang chờ. */
function PendingBanner({ status }: { status: AccountDeletionStatus }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => accountDeletionApi.cancelDeletion(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY });
      toast.success("Đã huỷ yêu cầu xoá tài khoản. Tài khoản của bạn vẫn hoạt động bình thường.");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không huỷ được yêu cầu.")),
  });

  return (
    <div
      className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-3 sm:p-4"
      data-testid="account-deletion-pending"
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:h-5 sm:w-5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">Tài khoản sắp được xoá</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90 sm:text-sm">
            {status.scheduledFor ? (
              <>
                Tài khoản của bạn sẽ bị xoá vào{" "}
                <strong className="font-semibold">{formatScheduledDate(status.scheduledFor)}</strong>
                {status.daysRemaining != null && status.daysRemaining > 0 ? (
                  <> (còn {status.daysRemaining} ngày)</>
                ) : (
                  <> (hôm nay)</>
                )}
                . Bạn vẫn đăng nhập và huỷ được bất cứ lúc nào.
              </>
            ) : (
              "Yêu cầu xoá tài khoản của bạn đang chờ được xử lý."
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-full border-amber-400 bg-white/70 sm:w-auto"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {cancel.isPending ? "Đang huỷ..." : "Huỷ xoá tài khoản"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Khu vực xoá tài khoản: nút mở hộp thoại xác nhận, hoặc banner khi đang chờ. */
export function DeleteAccountSection() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [graceDays, setGraceDays] = useState(7);
  const [showPassword, setShowPassword] = useState(false);

  const { data: status } = useQuery({
    queryKey: ACCOUNT_DELETION_QUERY_KEY,
    queryFn: accountDeletionApi.getStatus,
    staleTime: 30_000,
  });

  const request = useMutation({
    mutationFn: () =>
      accountDeletionApi.requestDeletion({
        currentPassword: password,
        confirmationText: confirmation,
        reason: reason.trim() || undefined,
        gracePeriodDays: graceDays,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY });
      setOpen(false);
      setPassword("");
      setConfirmation("");
      setReason("");
      toast.success(
        result.scheduledFor
          ? `Đã đặt lịch xoá tài khoản vào ${formatScheduledDate(result.scheduledFor)}. Bạn có thể huỷ bất cứ lúc nào.`
          : "Đã đặt lịch xoá tài khoản.",
      );
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không đặt lịch xoá được tài khoản.")),
  });

  const confirmationValid = confirmation.trim().toUpperCase() === DELETE_CONFIRMATION_PHRASE;
  const canSubmit = password.length > 0 && confirmationValid && !request.isPending;

  if (status?.status === "PENDING") {
    return <PendingBanner status={status} />;
  }

  return (
    <>
      <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive sm:h-5 sm:w-5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Xoá tài khoản</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Xoá vĩnh viễn hồ sơ, ảnh, tủ đồ và lịch sử tư vấn. Bạn có thể chọn khoảng thời gian chờ để
              huỷ nếu đổi ý. Lịch sử thanh toán được giữ ở dạng ẩn danh cho mục đích kế toán.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3 w-full rounded-full sm:w-auto"
              onClick={() => setOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Xoá tài khoản của tôi
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Xoá tài khoản của bạn?</DialogTitle>
            <DialogDescription>
              Đây là thao tác không thể hoàn tác sau khi tài khoản bị xoá. Bạn sẽ có một khoảng thời
              gian chờ để huỷ nếu đổi ý.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Toàn bộ dữ liệu cá nhân sẽ bị xoá: hồ sơ cơ thể, gu thời trang, ảnh thử mặc, tủ đồ,
                lịch sử tư vấn, đánh giá và các bài đăng trong cộng đồng.
              </p>
            </div>

            <div>
              <Label htmlFor="deleteGraceDays" className="text-xs sm:text-sm">
                Xoá sau
              </Label>
              <select
                id="deleteGraceDays"
                value={graceDays}
                onChange={(e) => setGraceDays(Number(e.target.value))}
                className="mt-1.5 flex h-11 w-full rounded-xl border border-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-10"
              >
                {GRACE_PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {graceDays === 0
                  ? "Tài khoản sẽ bị xoá ngay và không thể huỷ."
                  : "Bạn vẫn đăng nhập được và có thể huỷ yêu cầu trong khoảng thời gian chờ."}
              </p>
            </div>

            <div>
              <Label htmlFor="deletePassword" className="text-xs sm:text-sm">
                Mật khẩu hiện tại
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="deletePassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu để xác nhận"
                  autoComplete="current-password"
                  className="pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="deleteConfirmation" className="text-xs sm:text-sm">
                Gõ <span className="font-mono font-semibold">{DELETE_CONFIRMATION_PHRASE}</span> để xác nhận
              </Label>
              <Input
                id="deleteConfirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={DELETE_CONFIRMATION_PHRASE}
                autoComplete="off"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="deleteReason" className="text-xs sm:text-sm">
                Lý do rời bỏ (không bắt buộc)
              </Label>
              <textarea
                id="deleteReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Giúp chúng tôi cải thiện sản phẩm"
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full rounded-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Giữ tài khoản
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full rounded-full sm:w-auto"
              disabled={!canSubmit}
              onClick={() => request.mutate()}
            >
              {request.isPending ? "Đang xử lý..." : "Xác nhận xoá tài khoản"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
