"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import type { TwoFactorSetup } from "@/types/auth";

export const TWO_FACTOR_STATUS_KEY = ["two-factor-status"] as const;

type Mode = "idle" | "setup" | "disable" | "regenerate";

function groupSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = `FitMe AI — mã khôi phục xác thực 2 bước\nMỗi mã chỉ dùng được một lần.\n\n${codes.join("\n")}\n`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitme-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        Lưu các mã khôi phục này ở nơi an toàn (trình quản lý mật khẩu). Mỗi mã dùng được một lần khi bạn mất điện
        thoại. Mã sẽ không hiển thị lại.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(codes.join("\n")).then(() => toast.success("Đã sao chép"))}
        >
          Sao chép
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          Tải file .txt
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          Tôi đã lưu
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorCard({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { data: status, isLoading } = useQuery({ queryKey: TWO_FACTOR_STATUS_KEY, queryFn: authApi.getTwoFactorStatus });
  const [mode, setMode] = useState<Mode>("idle");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const reset = (next: Mode = "idle") => {
    setMode(next);
    setPassword("");
    setCode("");
    setError("");
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: TWO_FACTOR_STATUS_KEY });

  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Không thể cập nhật xác thực 2 bước"));
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      setSetup(await authApi.setupTwoFactor());
      reset("setup");
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !code.trim()) return;
    void run(async () => {
      if (mode === "setup") {
        const result = await authApi.enableTwoFactor(password, code.trim());
        await setAuth(result.session.user, result.session.accessToken, result.session.refreshToken);
        setRecoveryCodes(result.recoveryCodes);
        setSetup(null);
        toast.success("Đã bật xác thực 2 bước");
      } else if (mode === "disable") {
        await authApi.disableTwoFactor(password, code.trim());
        toast.success("Đã tắt xác thực 2 bước");
      } else if (mode === "regenerate") {
        setRecoveryCodes(await authApi.regenerateRecoveryCodes(password, code.trim()));
      }
      reset();
      await refresh();
    });
  };

  if (isLoading || !status) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Đang tải trạng thái bảo mật...</p>;
  }
  if (!status.available && !status.enabled) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-start gap-3">
        {status.enabled ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Xác thực 2 bước (Authenticator)</h2>
            <Badge variant={status.enabled ? "success" : "warning"}>{status.enabled ? "Đang bật" : "Chưa bật"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {status.enabled
              ? `Mỗi lần đăng nhập cần thêm mã 6 số từ ứng dụng xác thực. Còn ${status.recoveryCodesRemaining} mã khôi phục.`
              : "Bảo vệ tài khoản quản trị kể cả khi lộ mật khẩu: mỗi lần đăng nhập cần thêm mã 6 số từ điện thoại."}
          </p>
          {status.required && !status.enabled && (
            <p className="text-sm font-medium text-red-700">
              Trang quản trị yêu cầu xác thực 2 bước. Hãy bật ngay để tiếp tục sử dụng.
            </p>
          )}
          {status.required && status.enabled && !status.sessionVerified && (
            <p className="text-sm font-medium text-red-700">
              Phiên hiện tại đăng nhập không qua mã xác thực. Hãy đăng xuất và đăng nhập lại.
            </p>
          )}
        </div>
      </div>

      {recoveryCodes && <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />}

      {mode === "idle" && !recoveryCodes && (
        <div className="flex flex-wrap gap-2">
          {!status.enabled && (
            <Button type="button" onClick={startSetup} disabled={busy}>
              Bật xác thực 2 bước
            </Button>
          )}
          {status.enabled && (
            <>
              <Button type="button" variant="outline" onClick={() => reset("regenerate")}>
                Tạo mã khôi phục mới
              </Button>
              <Button type="button" variant="outline" className="text-red-700" onClick={() => reset("disable")}>
                Tắt xác thực 2 bước
              </Button>
            </>
          )}
        </div>
      )}

      {mode !== "idle" && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border p-4" noValidate>
          {mode === "setup" && setup && (
            <div className="space-y-3">
              <p className="text-sm">
                1. Mở Google Authenticator, Authy hoặc 1Password và quét mã QR (hoặc nhập khóa bên dưới).
              </p>
              <div className="w-fit rounded-lg bg-white p-3">
                <QRCodeSVG value={setup.otpauthUri} size={176} />
              </div>
              <p className="break-all font-mono text-sm">{groupSecret(setup.secret)}</p>
              <p className="text-sm">2. Nhập mật khẩu hiện tại và mã 6 số đang hiển thị trong ứng dụng.</p>
            </div>
          )}
          {mode === "disable" && (
            <p className="text-sm text-red-700">
              {status.required
                ? "Trang quản trị yêu cầu 2FA: sau khi tắt, bạn sẽ không vào được trang quản trị cho tới khi bật lại."
                : "Sau khi tắt, tài khoản chỉ còn được bảo vệ bằng mật khẩu."}
            </p>
          )}
          {mode === "regenerate" && (
            <p className="text-sm text-muted-foreground">Các mã khôi phục cũ sẽ hết hiệu lực.</p>
          )}
          <div>
            <Label htmlFor="tfa-password">Mật khẩu hiện tại</Label>
            <Input
              id="tfa-password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tfa-code">{mode === "setup" ? "Mã 6 số" : "Mã 6 số hoặc mã khôi phục"}</Label>
            <Input
              id="tfa-code"
              inputMode={mode === "setup" ? "numeric" : "text"}
              autoComplete="one-time-code"
              maxLength={20}
              className="mt-1 tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant={mode === "disable" ? "destructive" : "default"}
              disabled={busy || !password || !code.trim()}
            >
              {busy
                ? "Đang xử lý..."
                : mode === "setup"
                  ? "Xác nhận và bật"
                  : mode === "disable"
                    ? "Tắt xác thực 2 bước"
                    : "Tạo mã mới"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSetup(null);
                reset();
              }}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {mode === "idle" && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
