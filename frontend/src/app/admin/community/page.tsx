"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actionFeedback } from "@/lib/action-feedback";
import { portalTableActionsClass } from "@/lib/design-tokens";

export default function AdminCommunityPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"posts" | "reports">("reports");
  const [visibility, setVisibility] = useState<string>("");
  const [reportStatus, setReportStatus] = useState("OPEN");

  const statsQuery = useQuery({
    queryKey: ["admin-community-stats"],
    queryFn: () => adminApi.getCommunityStats(),
  });

  const postsQuery = useQuery({
    queryKey: ["admin-community-posts", visibility],
    queryFn: () => adminApi.listCommunityPosts({ visibility: visibility || undefined, size: 30 }),
    enabled: tab === "posts",
  });

  const reportsQuery = useQuery({
    queryKey: ["admin-community-reports", reportStatus],
    queryFn: () => adminApi.listCommunityReports({ status: reportStatus || undefined, size: 30 }),
    enabled: tab === "reports",
  });

  const hide = useMutation({
    mutationFn: (id: string) => adminApi.hideCommunityPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
      actionFeedback({ successMessage: "Đã ẩn bài" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không ẩn được bài" }).onError,
  });

  const unhide = useMutation({
    mutationFn: (id: string) => adminApi.unhideCommunityPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
      actionFeedback({ successMessage: "Đã hiện lại bài" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không khôi phục được bài" }).onError,
  });

  const resolve = useMutation({
    mutationFn: (input: { id: string; hidePost?: boolean; status: string }) =>
      adminApi.resolveCommunityReport(input.id, {
        status: input.status,
        hidePost: input.hidePost,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-community-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-community-posts"] });
      actionFeedback({ successMessage: "Đã xử lý báo cáo" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không xử lý được báo cáo" }).onError,
  });

  const stats = statsQuery.data;

  return (
    <PortalAdminPage
      title="Cộng đồng"
      description="Duyệt báo cáo, ẩn/hiện bài đăng và theo dõi mức tương tác."
    >
      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Bài công khai", stats.totalPosts],
            ["7 ngày gần đây", stats.postsLast7Days],
            ["Tác giả", stats.authorsWithPosts],
            ["Lượt thích", stats.totalLikes],
            ["Lượt xem", stats.totalViews],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")}>
          Báo cáo
        </Button>
        <Button type="button" size="sm" variant={tab === "posts" ? "default" : "outline"} onClick={() => setTab("posts")}>
          Bài đăng
        </Button>
      </div>

      {tab === "reports" && (
        <>
          <div className="mb-3 flex gap-2">
            {["OPEN", "RESOLVED", "DISMISSED", ""].map((s) => (
              <Button key={s || "all"} type="button" size="sm" variant={reportStatus === s ? "secondary" : "ghost"} onClick={() => setReportStatus(s)}>
                {s || "Tất cả"}
              </Button>
            ))}
          </div>
          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Người báo</th>
                <th className={portalTableThClass}>Loại</th>
                <th className={portalTableThClass}>Lý do</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {(reportsQuery.data?.items ?? []).map((r) => (
                <tr key={r.id}>
                  <td className={portalTableTdClass}>{r.reporterDisplayName || "—"}</td>
                  <td className={portalTableTdClass}>{r.targetType}</td>
                  <td className={portalTableTdClass}>
                    <div>{r.reason}</div>
                    {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                  </td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{r.status}</Badge>
                  </td>
                  <td className={portalTableTdClass}>
                    {r.status === "OPEN" && (
                      <PortalActionGroup className={portalTableActionsClass}>
                        <PortalActionButton
                          onClick={() => resolve.mutate({ id: r.id, status: "RESOLVED", hidePost: r.targetType === "POST" })}
                        >
                          Ẩn & xử lý
                        </PortalActionButton>
                        <PortalActionButton onClick={() => resolve.mutate({ id: r.id, status: "DISMISSED" })}>
                          Bỏ qua
                        </PortalActionButton>
                      </PortalActionGroup>
                    )}
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}

      {tab === "posts" && (
        <>
          <div className="mb-3 flex gap-2">
            {["", "PUBLIC", "HIDDEN", "REMOVED"].map((s) => (
              <Button key={s || "all"} type="button" size="sm" variant={visibility === s ? "secondary" : "ghost"} onClick={() => setVisibility(s)}>
                {s || "Tất cả"}
              </Button>
            ))}
          </div>
          <PortalDataTable>
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tác giả</th>
                <th className={portalTableThClass}>Nội dung</th>
                <th className={portalTableThClass}>TT</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {(postsQuery.data?.items ?? []).map((p) => {
                const id = String(p.id);
                const visibilityValue = String(p.visibility ?? "");
                return (
                  <tr key={id}>
                    <td className={portalTableTdClass}>{String(p.authorDisplayName ?? "—")}</td>
                    <td className={portalTableTdClass}>
                      <div className="max-w-md truncate">{String(p.caption || p.title || "—")}</div>
                    </td>
                    <td className={portalTableTdClass}>
                      <Badge variant="outline">{visibilityValue}</Badge>
                    </td>
                    <td className={portalTableTdClass}>
                      <PortalActionGroup className={portalTableActionsClass}>
                        {visibilityValue === "PUBLIC" && (
                          <PortalActionButton onClick={() => hide.mutate(id)}>Ẩn</PortalActionButton>
                        )}
                        {visibilityValue === "HIDDEN" && (
                          <PortalActionButton onClick={() => unhide.mutate(id)}>Hiện lại</PortalActionButton>
                        )}
                      </PortalActionGroup>
                    </td>
                  </tr>
                );
              })}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalAdminPage>
  );
}
