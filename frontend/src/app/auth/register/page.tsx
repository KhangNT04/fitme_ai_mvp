"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/services/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/layout/AuthCardShell";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { registerSchema, type RegisterForm } from "@/utils/validators";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center px-4 text-muted-foreground">Đang tải...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("Đang tải câu hỏi...");
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const formStartedAtMs = useMemo(() => Date.now(), []);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      website: "",
      captchaAnswer: "",
      formStartedAtMs,
    },
  });

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setError("");
    try {
      const challenge = await authApi.getCaptcha();
      setCaptchaId(challenge.captchaId);
      setCaptchaQuestion(challenge.question);
      setValue("captchaAnswer", "");
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Không tải được xác nhận chống spam"));
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    void loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    if (!captchaId) {
      setError("Thiếu mã xác nhận. Tải lại câu hỏi rồi thử lại.");
      return;
    }
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        website: data.website || "",
        captchaId,
        captchaAnswer: data.captchaAnswer,
        formStartedAtMs,
      });
      const params = new URLSearchParams({ email: data.email });
      if (res.verificationCode) {
        params.set("hint", res.verificationCode);
      }
      router.push(`/auth/verify-email?${params.toString()}`);
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Đăng ký thất bại"));
      void loadCaptcha();
    }
  };

  return (
    <AuthCardShell
      title="Đăng ký tài khoản"
      backHref="/auth/login"
      backLabel="Quay lại đăng nhập"
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã có tài khoản? <Link href="/auth/login" className="underline">Đăng nhập</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
        {/* Honeypot — hidden from users, bots often fill it */}
        <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-0 w-0 overflow-hidden">
          <Label htmlFor="website">Website</Label>
          <Input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>
        <div>
          <Label htmlFor="reg-fullName">Họ tên</Label>
          <Input id="reg-fullName" {...register("fullName")} className="mt-1" />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <Label htmlFor="reg-email">Email</Label>
          <Input id="reg-email" type="email" {...register("email")} className="mt-1" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="reg-password">Mật khẩu</Label>
          <Input id="reg-password" type="password" {...register("password")} className="mt-1" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="reg-confirm">Xác nhận mật khẩu</Label>
          <Input id="reg-confirm" type="password" {...register("confirmPassword")} className="mt-1" />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Xác nhận chống spam</Label>
            <button
              type="button"
              className="text-xs underline text-muted-foreground"
              onClick={() => void loadCaptcha()}
              disabled={captchaLoading || isSubmitting}
            >
              Đổi câu hỏi
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{captchaLoading ? "Đang tải..." : captchaQuestion}</p>
          <Input
            inputMode="numeric"
            autoComplete="off"
            placeholder="Nhập kết quả"
            {...register("captchaAnswer")}
            className="mt-2"
          />
          {errors.captchaAnswer && <p className="mt-1 text-xs text-red-600">{errors.captchaAnswer.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || captchaLoading}>
          {isSubmitting ? "Đang đăng ký..." : "Đăng ký & xác nhận"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sau khi đăng ký bạn sẽ nhập mã xác nhận để kích hoạt tài khoản — giúp hạn chế bot và spam.
        </p>
      </form>
    </AuthCardShell>
  );
}
