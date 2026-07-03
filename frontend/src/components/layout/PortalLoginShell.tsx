import Link from "next/link";
import { AuthCardShell } from "@/components/layout/AuthCardShell";

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
    <AuthCardShell
      title={title}
      backHref={backHref}
      backLabel={backLabel}
      footer={
        footer ?? (
          <p className="mt-4 text-center text-sm">
            <Link href="/" className="text-muted-foreground hover:underline">
              Về trang chủ
            </Link>
          </p>
        )
      }
    >
      {children}
    </AuthCardShell>
  );
}
