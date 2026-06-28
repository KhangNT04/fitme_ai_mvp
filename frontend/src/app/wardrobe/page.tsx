"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { wardrobeApi } from "@/services/wardrobe-api";
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
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [consented, setConsented] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
    mutationFn: async () => {
      const item = await wardrobeApi.create({
        itemType: form.itemType,
        category: form.category,
        color: form.color,
        material: form.material,
        fit: form.fit,
        styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (pendingFile && consented) {
        await wardrobeApi.recordConsent();
        await wardrobeApi.uploadImage(item.id, pendingFile);
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      setShowAdd(false);
      setPendingFile(null);
      setConsented(false);
    },
  });

  return (
    <PageShell width="wide">
      <PageHeader title="Tủ đồ cá nhân" subtitle="Thêm đồ đang có để AI ưu tiên phối từ wardrobe" backHref="/" backLabel="Trang chủ" />

      <div className="surface-card mb-8 flex justify-end p-4 sm:p-5">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Thêm item
        </Button>
      </div>

      <div>
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
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.itemType} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/70 text-sm">Chưa có ảnh</div>
                    )}
                  </div>
                  <h3 className="mt-3 font-medium">{item.itemType}</h3>
                  <p className="text-sm text-muted-foreground">{item.category} · {item.color}</p>
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
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Chọn</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Màu</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Ảnh item (tùy chọn)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="mt-1 w-full text-sm"
                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
              />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
              <span className="text-sm">Đồng ý upload ảnh item (nếu có)</span>
            </label>
            <Button
              className="w-full"
              disabled={!form.itemType || !form.category || createMutation.isPending || (!!pendingFile && !consented)}
              onClick={() => createMutation.mutate()}
            >
              <Upload className="mr-2 h-4 w-4" />Lưu item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
