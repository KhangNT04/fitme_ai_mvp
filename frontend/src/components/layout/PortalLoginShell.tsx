import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/BackLink";

interface PortalLoginShellProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PortalLoginShell({
  title,
  children,
  footer,
  backHref = "/",
  backLabel = "Quay lại",
}: PortalLoginShellProps) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {backHref && <BackLink href={backHref} label={backLabel} className="mb-4" />}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="gradient-ai flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="font-display text-lg font-semibold text-foreground">FitMe AI</p>
        </div>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {children}
            {footer ?? (
              <p className="mt-4 text-center text-sm">
                <Link href="/" className="text-muted-foreground hover:underline">
                  Về trang chủ
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
