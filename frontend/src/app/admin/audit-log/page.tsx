"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { adminApi, type AdminAuditAction } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<AdminAuditAction, string> = {
  ADMIN_SIGN_IN: "Quản trị viên đăng nhập",
  USER_SUSPENDED: "Khóa tài khoản",
  USER_REACTIVATED: "Mở khóa tài khoản",
  USER_EMAIL_CHANGED: "Đổi email đăng nhập",
  USER_PASSWORD_SET: "Đặt mật khẩu (bàn giao brand)",
  USER_PASSWORD_RESET_LINK_SENT: "Gửi link đặt lại mật khẩu",
  CONSUMER_PLAN_CHANGED: "Đổi gói Free/Premium",
  FITKEN_ADJUSTED: "Điều chỉnh Fitken",
  MFA_ENABLED: "Bật xác thực 2 bước",
  MFA_DISABLED: "Tắt xác thực 2 bước",
  MFA_RECOVERY_CODE_USED: "Dùng mã khôi phục 2FA",
};

const SENSITIVE: AdminAuditAction[] = ["USER_EMAIL_CHANGED", "USER_PASSWORD_SET", "MFA_DISABLED", "MFA_RECOVERY_CODE_USED"];

const selectClass = "flex h-10 min-w-[14rem] rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function AdminAuditLogPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<"" | AdminAuditAction>("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-audit-log", query, action, page],
    queryFn: () =>
      adminApi.listAuditLog({ q: query || undefined, action: action || undefined, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <PortalAdminPage
      title="Nhật ký quản trị"
      description="Ai đã làm gì với tài khoản nào: khóa/mở khóa, đổi email, mật khẩu, gói, Fitken, đăng nhập quản trị và 2FA. Nhật ký chỉ ghi thêm, không sửa hay xóa được."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="list"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[16rem] flex-1 space-y-2">
            <Label htmlFor="audit-search">Tìm theo email</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="audit-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email quản trị viên hoặc tài khoản bị tác động"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-action">Hành động</Label>
            <select
              id="audit-action"
              className={selectClass}
              value={action}
              onChange={(e) => {
                setAction(e.target.value as "" | AdminAuditAction);
                setPage(0);
              }}
            >
              <option value="">Tất cả hành động</option>
              {(Object.keys(ACTION_LABELS) as AdminAuditAction[]).map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {data && data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Chưa có thao tác nào khớp bộ lọc.
          </p>
        ) : (
          <PortalDataTable showOnMobile className={cn(isFetching && "opacity-70 transition-opacity")}>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Thời gian</th>
                <th className={portalTableThClass}>Hành động</th>
                <th className={portalTableThClass}>Quản trị viên</th>
                <th className={portalTableThClass}>Tài khoản</th>
                <th className={portalTableThClass}>Chi tiết</th>
                <th className={portalTableThClass}>IP</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data?.items.map((entry) => (
                <tr key={entry.id}>
                  <td className={cn(portalTableTdClass, "whitespace-nowrap")}>{formatApiDate(entry.createdAt, true)}</td>
                  <td className={portalTableTdClass}>
                    <Badge
                      variant={SENSITIVE.includes(entry.action) ? "warning" : "outline"}
                      className="w-fit whitespace-nowrap"
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </td>
                  <td className={portalTableTdClass}>{entry.actorEmail ?? "—"}</td>
                  <td className={portalTableTdClass}>
                    {entry.targetId && entry.targetId === entry.actorId ? "(chính mình)" : entry.targetEmail ?? "—"}
                  </td>
                  <td className={cn(portalTableTdClass, "max-w-[22rem] break-words")}>{entry.details ?? "—"}</td>
                  <td className={cn(portalTableTdClass, "font-mono text-xs text-muted-foreground")}>
                    {entry.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        )}

        {data && data.total > data.size && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Trang trước"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page + 1} / {totalPages} · {data.total} thao tác
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Trang sau"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </PortalAdminPage>
  );
}
