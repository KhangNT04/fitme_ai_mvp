"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalFormCard } from "@/components/portal/PortalFormCard";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
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
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminOccasionRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-occasion-rules"],
    queryFn: () => adminApi.getOccasionRules(),
  });

  const create = useMutation({
    mutationFn: () => adminApi.createOccasionRule({ name, description: "", keywords: [], active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-occasion-rules"] });
      setName("");
      actionFeedback({ successMessage: "Đã thêm rule hoàn cảnh" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể thêm rule" }).onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteOccasionRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-occasion-rules"] });
      actionFeedback({ successMessage: "Đã xóa rule" }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa rule" }).onError,
  });

  return (
    <PortalAdminPage
      title="Quy tắc dịp"
      description="Quản lý từ khóa AI dùng để gợi ý outfit theo hoàn cảnh."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      empty={!data?.length}
      emptyTitle="Chưa có quy tắc"
      emptyDescription="Thêm rule hoàn cảnh để cải thiện gợi ý AI."
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
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <Badge variant="outline" className="mt-2">
                      {rule.active ? "Hoạt động" : "Tắt"}
                    </Badge>
                  </div>
                  <PortalActionButton variant="delete" onClick={() => remove.mutate(rule.id)}>
                    Xóa
                  </PortalActionButton>
                </div>
              </article>
            ))}
          </div>

          <PortalDataTable className="mt-6">
            <PortalDataTableHead>
              <tr>
                <th className={portalTableThClass}>Tên</th>
                <th className={portalTableThClass}>Trạng thái</th>
                <th className={portalTableThClass}>Thao tác</th>
              </tr>
            </PortalDataTableHead>
            <PortalDataTableBody>
              {data.map((rule) => (
                <tr key={rule.id}>
                  <td className={portalTableTdClass}>{rule.name}</td>
                  <td className={portalTableTdClass}>
                    <Badge variant="outline">{rule.active ? "Hoạt động" : "Tắt"}</Badge>
                  </td>
                  <td className={portalTableTdClass}>
                    <PortalActionGroup className={portalTableActionsClass}>
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
