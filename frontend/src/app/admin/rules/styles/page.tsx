"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalFormCard } from "@/components/portal/PortalFormCard";
import {
  PortalActionButton,
  PortalActionGroup,
  PortalActionLink,
} from "@/components/portal/PortalActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PortalDataTable,
  PortalDataTableBody,
  PortalDataTableHead,
  portalTableTdClass,
  portalTableThClass,
} from "@/components/portal/PortalDataTable";
import {
  portalCardActionsClass,
  portalCardClass,
  portalCardListClass,
  portalCardRowClass,
  portalTableActionsClass,
} from "@/lib/design-tokens";
import type { StyleRule } from "@/types/analytics";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminStyleRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-style-rules"],
    queryFn: () => adminApi.getStyleRules(),
  });

  const create = useMutation({
    mutationFn: () => adminApi.createStyleRule({ name, description: "", keywords: [], active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] });
      setName("");
      actionFeedback({ successMessage: "Đã thêm rule phong cách" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể thêm rule" }).onError,
  });

  const update = useMutation({
    mutationFn: ({ id, keywords }: { id: string; keywords: string[] }) =>
      adminApi.updateStyleRule(id, { keywords, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] });
      setEditingId(null);
      actionFeedback({ successMessage: "Đã cập nhật rule" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể cập nhật rule" }).onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStyleRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] });
      actionFeedback({ successMessage: "Đã xóa rule" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa rule" }).onError,
  });

  const ruleKeywords = (rule: StyleRule) => rule.keywords ?? rule.tags ?? [];

  return (
    <PortalAdminPage
      title="Quy tắc phong cách"
      description="Quản lý từ khóa AI dùng để gợi ý outfit theo phong cách."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có quy tắc"
      emptyDescription="Thêm rule phong cách để cải thiện gợi ý AI."
    >
      <PortalFormCard>
        <div className="flex flex-wrap gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên rule mới"
            className="max-w-sm flex-1"
          />
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Thêm rule
          </Button>
        </div>
      </PortalFormCard>

      {data && (
        <>
          <div className={`${portalCardListClass} mt-6`}>
            {data.map((rule) => (
              <article key={rule.id} className={portalCardClass}>
                <div className={portalCardRowClass}>
                  <div className="min-w-0">
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">{rule.description || "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Keywords: {ruleKeywords(rule).join(", ") || "—"}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {rule.active ? "Hoạt động" : "Tắt"}
                    </Badge>
                  </div>
                </div>
                <PortalActionGroup className={portalCardActionsClass}>
                  <PortalActionButton
                    variant="edit"
                    onClick={() => {
                      setEditingId(rule.id);
                      setEditKeywords(ruleKeywords(rule).join(", "));
                    }}
                  >
                    Sửa
                  </PortalActionButton>
                  <PortalActionButton variant="delete" onClick={() => remove.mutate(rule.id)}>
                    Xóa
                  </PortalActionButton>
                </PortalActionGroup>
                {editingId === rule.id && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={editKeywords}
                      onChange={(e) => setEditKeywords(e.target.value)}
                      placeholder="Keywords, cách nhau bởi dấu phẩy"
                      className="flex-1"
                    />
                    <PortalActionButton
                      variant="save"
                      onClick={() =>
                        update.mutate({
                          id: rule.id,
                          keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                        })
                      }
                    >
                      Lưu
                    </PortalActionButton>
                  </div>
                )}
              </article>
            ))}
          </div>

          <PortalDataTable className="mt-6">
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tên</th>
                <th className={portalTableThClass}>Keywords</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((rule) => (
                <tr key={rule.id}>
                  <td className={portalTableTdClass}>{rule.name}</td>
                  <td className={portalTableTdClass}>
                    {ruleKeywords(rule).join(", ") || "—"}
                  </td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{rule.active ? "Hoạt động" : "Tắt"}</Badge>
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionGroup className={portalTableActionsClass}>
                      <PortalActionButton
                        variant="edit"
                        onClick={() => {
                          setEditingId(rule.id);
                          setEditKeywords(ruleKeywords(rule).join(", "));
                        }}
                      >
                        Sửa
                      </PortalActionButton>
                      <PortalActionButton variant="delete" onClick={() => remove.mutate(rule.id)}>
                        Xóa
                      </PortalActionButton>
                    </PortalActionGroup>
                  </td>
                </tr>
              ))}
            </PortalDataTableBody>
          </PortalDataTable>
        </>
      )}
    </PortalAdminPage>
  );
}
