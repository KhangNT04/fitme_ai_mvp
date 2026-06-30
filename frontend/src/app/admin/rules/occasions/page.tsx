"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminOccasionRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
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
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Rule hoàn cảnh" />
      <div className="flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên rule mới" className="max-w-xs" />
        <Button onClick={() => create.mutate()} disabled={!name}>Thêm</Button>
      </div>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="space-y-3">
          {data?.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
              <div>
                <p className="font-medium">{rule.name}</p>
                <Badge variant="outline" className="mt-1">{rule.active ? "Hoạt động" : "Tắt"}</Badge>
              </div>
              <PortalActionButton variant="delete" onClick={() => remove.mutate(rule.id)}>
                Xóa
              </PortalActionButton>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
