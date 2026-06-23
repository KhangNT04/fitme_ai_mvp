"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { wardrobeApi } from "@/services/profile-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [consented, setConsented] = useState(false);
  const [form, setForm] = useState({
    itemType: "",
    category: "",
    color: "",
    material: "",
    fit: "",
    styleTags: "",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => wardrobeApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      wardrobeApi.create({
        itemType: form.itemType,
        category: form.category,
        color: form.color,
        material: form.material,
        fit: form.fit,
        styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      setShowAdd(false);
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tủ đồ cá nhân</h1>
          <p className="mt-2 text-stone-500">Thêm đồ đang có để AI ưu tiên phối từ wardrobe</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Thêm item
        </Button>
      </div>

      <div className="mt-8">
        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState
            title="Tủ đồ trống"
            description="Thêm item thủ công hoặc upload ảnh để AI phối đồ từ những gì bạn đã có."
            actionLabel="Thêm item thủ công"
            onAction={() => setShowAdd(true)}
          />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.itemType} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-400 text-sm">Chưa có ảnh</div>
                    )}
                  </div>
                  <h3 className="mt-3 font-medium">{item.itemType}</h3>
                  <p className="text-sm text-stone-500">{item.category} · {item.color}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.styleTags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm item vào tủ đồ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên item</Label>
              <Input value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Danh mục</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Chọn</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Màu</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
              <span className="text-sm">Đồng ý upload ảnh item (nếu có)</span>
            </label>
            <Button className="w-full" disabled={!form.itemType || !form.category || createMutation.isPending} onClick={() => createMutation.mutate()}>
              <Upload className="mr-2 h-4 w-4" />Lưu item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
