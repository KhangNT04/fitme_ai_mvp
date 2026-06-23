import { Suspense, type ReactNode } from "react";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingSkeleton count={1} />}>{children}</Suspense>;
}
