"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { StyleRule } from "@/types/analytics";

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
    },
  });

  const update = useMutation({
    mutationFn: ({ id, keywords }: { id: string; keywords: string[] }) =>
      adminApi.updateStyleRule(id, { keywords, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] });
      setEditingId(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStyleRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] }),
  });

  const ruleKeywords = (rule: StyleRule) => rule.keywords ?? rule.tags ?? [];

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Rule phong cách</h1>
      <div className="mt-6 flex gap-3">
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingId(rule.id);
                    setEditKeywords(ruleKeywords(rule).join(", "));
                  }}>Sửa</Button>
                  <Button size="sm" variant="outline" onClick={() => remove.mutate(rule.id)}>Xóa</Button>
                </div>
              </div>
              {editingId === rule.id && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                    placeholder="Keywords, cách nhau bởi dấu phẩy"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => update.mutate({
                    id: rule.id,
                    keywords: editKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                  })}>Lưu</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
