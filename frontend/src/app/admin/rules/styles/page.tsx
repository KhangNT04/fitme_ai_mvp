"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin-api";
import { PortalLayout, adminNav } from "@/components/layout/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function AdminStyleRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-style-rules"],
    queryFn: () => adminApi.getStyleRules(),
  });

  const create = useMutation({
    mutationFn: () => adminApi.createStyleRule({ name, description: "", tags: [], active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] });
      setName("");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStyleRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-style-rules"] }),
  });

  return (
    <PortalLayout title="Admin" nav={adminNav}>
      <h1 className="text-2xl font-bold">Rule phong cách</h1>
      <div className="mt-6 flex gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên rule mới" className="max-w-xs" />
        <Button onClick={() => create.mutate()} disabled={!name}>Thêm</Button>
      </div>
      {isLoading ? <LoadingSkeleton type="list" /> : (
        <div className="mt-8 space-y-3">
          {data?.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{rule.name}</p>
                <p className="text-sm text-stone-500">{rule.description}</p>
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
