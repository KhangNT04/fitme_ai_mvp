"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Send, ShieldCheck } from "lucide-react";
import { accountEmailApi } from "@/services/account-email-api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUserErrorMessage } from "@/lib/user-error-message";

const EMAIL_CHANGE_QUERY_KEY = ["account-email-change"] as const;

/** Bước 1: nhập email mới + xác nhận mật khẩu. */
function RequestStep({
  currentEmail,
  onSent,
}: {
  currentEmail: string;
  onSent: (pendingEmail: string) => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const request = useMutation({
    mutationFn: () => accountEmailApi.requestChange(password, newEmail.trim()),
    onSuccess: (result) => {
      toast.success("Mã xác minh đã được gửi tới email mới.");
      onSent(result.pendingEmail ?? newEmail.trim());
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không gửi được mã xác minh.")),
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const canSubmit = emailValid && password.length > 0 && !request.isPending;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <Label htmlFor="changeEmail" className="text-xs sm:text-sm">
          Email đăng nhập mới
        </Label>
        <Input
          id="changeEmail"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="ban@email.com"
          autoComplete="email"
          className="mt-1.5"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Email hiện tại: <span className="font-medium text-foreground">{currentEmail}</span>
        </p>
      </div>

      <div>
        <Label htmlFor="changeEmailPassword" className="text-xs sm:text-sm">
          Mật khẩu hiện tại
        </Label>
        <div className="relative mt-1.5">
          <Input
            id="changeEmailPassword"
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

      <Button
        type="button"
        className="w-full rounded-full"
        disabled={!canSubmit}
        onClick={() => request.mutate()}
      >
        <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {request.isPending ? "Đang gửi mã..." : "Gửi mã xác minh"}
      </Button>
    </div>
  );
}

/** Bước 2: nhập mã 6 số đã gửi tới email mới. */
function ConfirmStep({
  pendingEmail,
  onDone,
  onBack,
}: {
  pendingEmail: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const confirm = useMutation({
    mutationFn: () => accountEmailApi.confirmChange(code.trim()),
    onSuccess: async (auth) => {
      await setAuth(auth.user, auth.accessToken, auth.refreshToken);
      void queryClient.invalidateQueries({ queryKey: EMAIL_CHANGE_QUERY_KEY });
      toast.success("Email đăng nhập đã được cập nhật.");
      onDone();
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Mã xác minh không đúng.")),
  });

  const codeValid = /^\d{6}$/.test(code.trim());

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
        Mã xác minh 6 số đã được gửi tới <span className="font-semibold text-foreground">{pendingEmail}</span>.
        Nhập mã để hoàn tất đổi email. Email cũ vẫn đăng nhập được cho tới khi bạn xác nhận.
      </div>

      <div>
        <Label htmlFor="changeEmailCode" className="text-xs sm:text-sm">
          Mã xác minh
        </Label>
        <Input
          id="changeEmailCode"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="mt-1.5 text-center font-mono text-lg tracking-[0.3em]"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-full sm:w-auto"
          onClick={onBack}
          disabled={confirm.isPending}
        >
          Quay lại
        </Button>
        <Button
          type="button"
          className="min-h-11 w-full rounded-full sm:flex-1"
          disabled={!codeValid || confirm.isPending}
          onClick={() => confirm.mutate()}
        >
          <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {confirm.isPending ? "Đang xác nhận..." : "Xác nhận & đổi email"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Khu vực đổi email đăng nhập: xác nhận mật khẩu rồi xác minh email mới.
 * Tài khoản vẫn đăng nhập bằng email cũ cho tới khi bước 2 hoàn tất.
 */
export function ChangeEmailSection() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [pendingEmail, setPendingEmail] = useState("");

  const { data: status } = useQuery({
    queryKey: EMAIL_CHANGE_QUERY_KEY,
    queryFn: accountEmailApi.getStatus,
    staleTime: 30_000,
  });

  const cancel = useMutation({
    mutationFn: () => accountEmailApi.cancelChange(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EMAIL_CHANGE_QUERY_KEY });
      toast.info("Đã huỷ yêu cầu đổi email.");
    },
    onError: (err) => toast.error(getUserErrorMessage(err, "Không huỷ được yêu cầu.")),
  });

  // Mở hộp thoại khi đã có yêu cầu đổi email đang chờ -> vào thẳng bước nhập mã.
  useEffect(() => {
    if (status?.pending && status.pendingEmail) {
      setPendingEmail(status.pendingEmail);
      setStep("confirm");
    }
  }, [status?.pending, status?.pendingEmail]);

  const currentEmail = user?.email ?? "";

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Email đăng nhập</p>
            <p className="mt-1 break-all text-xs text-muted-foreground sm:text-sm">{currentEmail}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full rounded-full sm:w-auto"
              onClick={() => {
                setStep("request");
                setOpen(true);
              }}
            >
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Đổi email
            </Button>
          </div>
        </div>
      </div>

      {status?.pending && status.pendingEmail && (
        <div
          className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50/80 p-3 sm:p-4"
          data-testid="email-change-pending"
          role="status"
        >
          <p className="text-sm font-semibold text-amber-900">Đang chờ xác minh email mới</p>
          <p className="mt-1 break-all text-xs text-amber-900/90 sm:text-sm">
            Mã xác minh đã gửi tới <span className="font-semibold">{status.pendingEmail}</span>. Email cũ vẫn
            đăng nhập được cho tới khi bạn xác nhận.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setPendingEmail(status.pendingEmail ?? "");
                setStep("confirm");
                setOpen(true);
              }}
            >
              Nhập mã xác minh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-amber-400 bg-white/70"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Huỷ đổi email
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Đổi email đăng nhập</DialogTitle>
            <DialogDescription>
              Xác nhận mật khẩu, rồi nhập mã 6 số gửi tới email mới. Tài khoản vẫn đăng nhập bằng email cũ cho
              tới khi bạn xác nhận mã.
            </DialogDescription>
          </DialogHeader>

          {step === "request" ? (
            <RequestStep
              currentEmail={currentEmail}
              onSent={(email) => {
                setPendingEmail(email);
                setStep("confirm");
              }}
            />
          ) : (
            <ConfirmStep
              pendingEmail={pendingEmail}
              onDone={() => {
                setOpen(false);
                setStep("request");
              }}
              onBack={() => setStep("request")}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
