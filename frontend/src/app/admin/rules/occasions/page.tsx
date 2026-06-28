"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

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
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteOccasionRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-occasion-rules"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Rule hoàn cảnh</h1>
      <div className="mt-6 flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên rule mới" className="max-w-xs" />
        <Button onClick={() => create.mutate()} disabled={!name}>Thêm</Button>
      </div>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 space-y-3">
          {data?.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
              <div>
                <p className="font-medium">{rule.name}</p>
                <Badge variant="outline" className="mt-1">{rule.active ? "Hoạt động" : "Tắt"}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => remove.mutate(rule.id)}>Xóa</Button>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
