import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PinnedBackLink } from "@/components/layout/PinnedBackLink";
import { cn } from "@/lib/utils";

interface AuthCardShellProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  backHref?: string;
  backLabel?: string;
}

export function AuthCardShell({
  title,
  children,
  footer,
  className,
  backHref = "/",
  backLabel = "Quay lại",
}: AuthCardShellProps) {
  return (
    <div className={cn("mx-auto max-w-md px-4 py-12", className)}>
      {backHref && <PinnedBackLink href={backHref} label={backLabel} className="mb-6" />}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="gradient-ai flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <p className="font-display text-lg font-semibold text-foreground">FitMe AI</p>
      </div>
      <Card className="glass-panel border-white/60 shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {children}
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}
