"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Crown, Lock, Search, Store, Users } from "lucide-react";
import {
  adminApi,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { StatCard, StatCardGrid } from "@/components/common/AnalyticsChart";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actionFeedback } from "@/lib/action-feedback";
import { formatApiDate } from "@/lib/date-format";
import { portalTableActionsClass } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<AdminUserRole, string> = {
  USER: "Người dùng",
  BRAND_OWNER: "Brand",
  ADMIN: "Quản trị viên",
};

const ROLE_OPTIONS: { value: "" | AdminUserRole; label: string }[] = [
  { value: "", label: "Tất cả vai trò" },
  { value: "USER", label: "Người dùng" },
  { value: "BRAND_OWNER", label: "Brand" },
  { value: "ADMIN", label: "Quản trị viên" },
];

const STATUS_OPTIONS: { value: "" | AdminUserStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "SUSPENDED", label: "Đã khóa" },
];

const selectClass = "flex h-10 min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm";

function formatDay(iso?: string | null) {
  if (!iso) return "Chưa có";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | AdminUserRole>("");
  const [status, setStatus] = useState<"" | AdminUserStatus>("");
  const [page, setPage] = useState(0);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [fitkenTarget, setFitkenTarget] = useState<AdminUser | null>(null);
  const [fitkenDelta, setFitkenDelta] = useState(0);
  const [fitkenNote, setFitkenNote] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-users", query, role, status, page],
    queryFn: () =>
      adminApi.listUsers({
        q: query || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const statusMutation = useMutation({
    mutationFn: ({ user, next }: { user: AdminUser; next: AdminUserStatus }) =>
      adminApi.setUserStatus(user.id, next),
    onSuccess: (user) => {
      setLockTarget(null);
      refresh();
      actionFeedback({
        successMessage: user.status === "SUSPENDED" ? `Đã khóa ${user.email}` : `Đã mở khóa ${user.email}`,
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể cập nhật trạng thái tài khoản" }).onError,
  });

  const planMutation = useMutation({
    mutationFn: ({ user, plan }: { user: AdminUser; plan: "FREE" | "PREMIUM" }) =>
      adminApi.setUserConsumerPlan(user.id, plan),
    onSuccess: (_, { user, plan }) => {
      refresh();
      actionFeedback({
        successMessage: plan === "PREMIUM" ? `Đã nâng ${user.email} lên Premium` : `Đã chuyển ${user.email} về Free`,
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể đổi gói" }).onError,
  });

  const fitkenMutation = useMutation({
    mutationFn: () =>
      adminApi.adjustConsumerFitken(fitkenTarget!.id, { delta: fitkenDelta, note: fitkenNote.trim() || undefined }),
    onSuccess: (detail) => {
      setFitkenTarget(null);
      refresh();
      actionFeedback({ successMessage: `Số dư Fitken mới: ${detail.wallet.balance}` }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể điều chỉnh Fitken" }).onError,
  });

  const openFitken = (user: AdminUser) => {
    setFitkenTarget(user);
    setFitkenDelta(0);
    setFitkenNote("");
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const summary = data?.summary;

  return (
    <PortalAdminPage
      title="Quản lý tài khoản"
      description="Tìm kiếm mọi tài khoản (người dùng, brand, quản trị viên), khóa/mở khóa đăng nhập, đổi gói và điều chỉnh Fitken."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="list"
    >
      <div className="space-y-6">
        {summary && (
          <StatCardGrid>
            <StatCard label="Tổng tài khoản" value={summary.totalAccounts} icon={<Users className="h-5 w-5" />} tone="violet" />
            <StatCard
              label="Người dùng"
              value={summary.consumers}
              sub={`${summary.premiumUsers} đang dùng Premium`}
              icon={<Crown className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Brand"
              value={summary.brandOwners}
              sub={`${summary.admins} quản trị viên`}
              icon={<Store className="h-5 w-5" />}
              tone="sky"
            />
            <StatCard label="Đang bị khóa" value={summary.suspended} icon={<Lock className="h-5 w-5" />} tone="rose" />
          </StatCardGrid>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[16rem] flex-1 space-y-2">
            <Label htmlFor="user-search">Tìm kiếm</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email hoặc tên hiển thị"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Vai trò</Label>
            <select
              id="user-role"
              className={selectClass}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as "" | AdminUserRole);
                setPage(0);
              }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-status">Trạng thái</Label>
            <select
              id="user-status"
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "" | AdminUserStatus);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {data && data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Không có tài khoản nào khớp bộ lọc.
          </p>
        ) : (
          <PortalDataTable showOnMobile className={cn(isFetching && "opacity-70 transition-opacity")}>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tài khoản</th>
                <th className={portalTableThClass}>Vai trò</th>
                <th className={portalTableThClass}>Gói · Fitken</th>
                <th className={portalTableThClass}>Hoạt động gần nhất</th>
                <th className={portalTableThClass}>Ngày tạo</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data?.items.map((user) => {
                const isSelf = user.id === currentUserId;
                const isConsumer = user.role === "USER";
                const locked = user.status === "SUSPENDED";
                return (
                  <tr key={user.id}>
                    <td className={portalTableTdClass}>
                      <div className="flex min-w-[12rem] flex-col">
                        <span className="font-medium">
                          {user.displayName || "—"}
                          {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(bạn)</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        {!user.emailVerified && <span className="text-xs text-amber-700">Chưa xác minh email</span>}
                      </div>
                    </td>
                    <td className={portalTableTdClass}>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={user.role === "ADMIN" ? "default" : "outline"} className="w-fit whitespace-nowrap">
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        {user.brandName && <span className="text-xs text-muted-foreground">{user.brandName}</span>}
                      </div>
                    </td>
                    <td className={portalTableTdClass}>
                      {isConsumer ? (
                        <div className="flex flex-col">
                          <span className={cn("font-medium", user.consumerPlan === "PREMIUM" && "text-primary")}>
                            {user.consumerPlan === "PREMIUM" ? "Premium" : "Free"}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{user.fitkenBalance} Fitken</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={portalTableTdClass}>{formatDay(user.lastActiveDate)}</td>
                    <td className={portalTableTdClass}>{formatApiDate(user.createdAt, false)}</td>
                    <td className={portalTableTdClass}>
                      <Badge variant={locked ? "warning" : "success"}>{locked ? "Đã khóa" : "Hoạt động"}</Badge>
                    </td>
                    <td className={portalTableTdClass}>
                      <PortalActionGroup className={portalTableActionsClass}>
                        {isConsumer && (
                          <>
                            <PortalActionButton
                              variant="analytics"
                              hideIcon
                              disabled={planMutation.isPending}
                              onClick={() =>
                                planMutation.mutate({ user, plan: user.consumerPlan === "PREMIUM" ? "FREE" : "PREMIUM" })
                              }
                            >
                              {user.consumerPlan === "PREMIUM" ? "Về Free" : "Lên Premium"}
                            </PortalActionButton>
                            <PortalActionButton variant="edit" hideIcon onClick={() => openFitken(user)}>
                              Fitken
                            </PortalActionButton>
                          </>
                        )}
                        {!isSelf && user.role !== "ADMIN" && (
                          <PortalActionButton
                            variant={locked ? "approve" : "suspend"}
                            hideIcon
                            onClick={() =>
                              locked
                                ? statusMutation.mutate({ user, next: "ACTIVE" })
                                : setLockTarget(user)
                            }
                            disabled={statusMutation.isPending}
                          >
                            {locked ? "Mở khóa" : "Khóa"}
                          </PortalActionButton>
                        )}
                      </PortalActionGroup>
                    </td>
                  </tr>
                );
              })}
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
              Trang {page + 1} / {totalPages} · {data.total} tài khoản
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

      <ConfirmDialog
        open={!!lockTarget}
        onOpenChange={(open) => !open && setLockTarget(null)}
        title="Khóa tài khoản?"
        description={`${lockTarget?.email ?? ""} sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập cho đến khi được mở khóa.`}
        confirmLabel="Khóa tài khoản"
        variant="destructive"
        loading={statusMutation.isPending}
        onConfirm={() => lockTarget && statusMutation.mutate({ user: lockTarget, next: "SUSPENDED" })}
      />

      <Dialog open={!!fitkenTarget} onOpenChange={(open) => !open && setFitkenTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Điều chỉnh Fitken</DialogTitle>
            <DialogDescription>
              {fitkenTarget?.email} · số dư hiện tại {fitkenTarget?.fitkenBalance ?? 0} Fitken. Nhập số dương để cộng,
              số âm để trừ.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (fitkenDelta !== 0) fitkenMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="fitken-delta">Số Fitken (+/−)</Label>
              <Input
                id="fitken-delta"
                type="number"
                value={fitkenDelta}
                onChange={(e) => setFitkenDelta(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fitken-note">Ghi chú nội bộ</Label>
              <Input
                id="fitken-note"
                value={fitkenNote}
                onChange={(e) => setFitkenNote(e.target.value)}
                placeholder="Ví dụ: Bù lượt thử đồ lỗi"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFitkenTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={fitkenMutation.isPending || fitkenDelta === 0}>
                {fitkenMutation.isPending ? "Đang xử lý..." : "Áp dụng"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PortalAdminPage>
  );
}
