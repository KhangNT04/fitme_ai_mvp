"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  PortalActionButton,
  PortalActionGroup,
} from "@/components/portal/PortalActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { StyleRule } from "@/types/analytics";
import { actionFeedback } from "@/lib/action-feedback";

export default function AdminStyleRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState("");

  const { data, isLoading } = useQuery({
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
    <PortalLayout title="Admin" nav={adminNav}>
      <PortalPageHeader title="Rule phong cách" />
      <div className="flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên rule mới" className="max-w-xs" />
        <Button onClick={() => create.mutate()} disabled={!name}>Thêm</Button>
      </div>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 space-y-3">
          {data?.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-border/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Keywords: {ruleKeywords(rule).join(", ") || "—"}</p>
                  <Badge variant="outline" className="mt-1">{rule.active ? "Hoạt động" : "Tắt"}</Badge>
                </div>
                <PortalActionGroup>
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
              </div>
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
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
