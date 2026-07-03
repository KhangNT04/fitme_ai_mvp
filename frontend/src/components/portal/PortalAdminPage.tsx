"use client";

import type { ReactNode } from "react";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";

type SkeletonType = "list" | "card" | "detail";

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
  skeleton = "list",
  children,
}: PortalAdminPageProps) {
  const showContent = !isLoading && !error && !empty;

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

      {isLoading && (
        <LoadingSkeleton
          type={skeleton === "card" ? "card" : skeleton === "detail" ? "detail" : "list"}
          count={skeleton === "card" ? 4 : undefined}
        />
      )}
      {!!error && onRetry && <ErrorState onRetry={onRetry} />}
      {!isLoading && !error && empty && (
        <EmptyState
          title={emptyTitle ?? "Chưa có dữ liệu"}
          description={emptyDescription}
        />
      )}
      {showContent && children}
    </PortalLayout>
  );
}
