"use client";

import { useEffect, type ReactNode } from "react";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { AdminTwoFactorGate } from "@/components/portal/AdminTwoFactorGate";
import { emitAuthSessionExpired } from "@/lib/auth-events";

type SkeletonType = "list" | "card" | "detail";

function isUnauthorizedError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 401,
  );
}

interface PortalAdminPageProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  skeleton?: SkeletonType;
  children: ReactNode;
}

export function PortalAdminPage({
  title,
  description,
  backHref,
  backLabel,
  headerActions,
  isLoading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  skeleton = "list",
  children,
}: PortalAdminPageProps) {
  const unauthorized = isUnauthorizedError(error);
  const showContent = !isLoading && !error && !empty;

  useEffect(() => {
    if (unauthorized) emitAuthSessionExpired();
  }, [unauthorized]);

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader
        title={title}
        description={description}
        backHref={backHref}
        backLabel={backLabel}
      >
        {headerActions}
      </PortalPageHeader>

      <AdminTwoFactorGate>
        {(isLoading || unauthorized) && (
          <LoadingSkeleton
            type={skeleton === "card" ? "card" : skeleton === "detail" ? "detail" : "list"}
            count={skeleton === "card" ? 4 : undefined}
          />
        )}
        {!!error && !unauthorized && onRetry && <ErrorState onRetry={onRetry} />}
        {!isLoading && !error && empty && (
          <EmptyState
            title={emptyTitle ?? "Chưa có dữ liệu"}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            actionHref={emptyActionHref}
          />
        )}
        {showContent && children}
      </AdminTwoFactorGate>
    </PortalLayout>
  );
}
