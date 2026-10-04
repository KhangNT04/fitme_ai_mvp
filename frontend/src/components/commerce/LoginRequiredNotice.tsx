"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consumerGuestPromptClass } from "@/lib/design-tokens";

/** Shown briefly while a guest is being redirected to login (or if redirect is blocked). */
export function LoginRequiredNotice({ next, message }: { next: string; message?: string }) {
  return (
    <div className={consumerGuestPromptClass}>
      <LogIn className="mx-auto h-8 w-8 text-muted-foreground/70" aria-hidden />
      <p className="mt-3 text-sm font-medium">{message ?? "Vui lòng đăng nhập để tiếp tục"}</p>
      <Button asChild className="mt-4 rounded-full" size="sm">
        <Link href={`/auth/login?redirect=${encodeURIComponent(next)}`}>Đăng nhập</Link>
      </Button>
    </div>
  );
}
