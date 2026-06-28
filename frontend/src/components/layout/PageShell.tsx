import { cn } from "@/lib/utils";
import {
  pageContainer,
  pageContainerMedium,
  pageContainerNarrow,
  pageContainerWide,
} from "@/lib/design-tokens";

type PageShellWidth = "narrow" | "medium" | "wide" | "full";

const widthClass: Record<PageShellWidth, string> = {
  narrow: pageContainerNarrow,
  medium: pageContainerMedium,
  wide: pageContainerWide,
  full: pageContainer,
};

interface PageShellProps {
  children: React.ReactNode;
  width?: PageShellWidth;
  className?: string;
}

export function PageShell({ children, width = "narrow", className }: PageShellProps) {
  return <div className={cn(widthClass[width], className)}>{children}</div>;
}
