"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/services/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { changePasswordSchema, type ChangePasswordForm as ChangePasswordValues } from "@/utils/validators";

const FIELDS: { name: keyof ChangePasswordValues; label: string; autoComplete: string }[] = [
  { name: "currentPassword", label: "Mật khẩu hiện tại", autoComplete: "current-password" },
  { name: "newPassword", label: "Mật khẩu mới", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Nhập lại mật khẩu mới", autoComplete: "new-password" },
];

export function ChangePasswordForm({ className }: { className?: string }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordValues) => {
    setError("");
    setDone(false);
    try {
      const auth = await authApi.changePassword(data.currentPassword, data.newPassword);
      await setAuth(auth.user, auth.accessToken, auth.refreshToken);
      reset();
      setDone(true);
      toast.success("Đã đổi mật khẩu");
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Không thể đổi mật khẩu"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)} noValidate>
      {FIELDS.map((field) => (
        <div key={field.name}>
          <Label htmlFor={`pwd-${field.name}`}>{field.label}</Label>
          <Input
            id={`pwd-${field.name}`}
            type={visible ? "text" : "password"}
            autoComplete={field.autoComplete}
            className="mt-1"
            aria-invalid={!!errors[field.name]}
            {...register(field.name)}
          />
          {errors[field.name] && (
            <p className="mt-1 text-xs text-red-600">{errors[field.name]?.message}</p>
          )}
        </div>
      ))}

      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      </button>

      <p className="text-xs text-muted-foreground">
        Mật khẩu mới tối thiểu 8 ký tự. Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-emerald-700">Mật khẩu đã được cập nhật.</p>}

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? "Đang cập nhật..." : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
