"use client";

import { useEffect, useRef, useState } from "react";
import { AppImage } from "@/components/common/AppImage";
import { validateImageFile } from "@/lib/upload-file";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { wardrobeApi } from "@/services/wardrobe-api";
import { useEnsureSession } from "@/hooks/use-ensure-session";
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
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";

const EMPTY_FORM = {
  itemType: "",
  category: "",
  color: "",
  material: "",
  fit: "",
  styleTags: "",
};

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { ensureSession } = useEnsureSession();
  const [sessionReady, setSessionReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [consented, setConsented] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    void ensureSession().then((session) => {
      if (session) setSessionReady(true);
    });
  }, [ensureSession]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPendingFile(null);
    setConsented(false);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => wardrobeApi.list(),
    enabled: sessionReady,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const session = await ensureSession();
      if (!session) throw new Error("Không thể khởi tạo phiên. Vui lòng thử lại.");

      const item = await wardrobeApi.create({
        itemType: form.itemType.trim(),
        category: form.category,
        color: form.color.trim(),
        material: form.material.trim() || undefined,
        fit: form.fit.trim() || undefined,
        styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
      });

      if (pendingFile) {
        if (!consented) {
          throw new Error("Vui lòng đồng ý upload ảnh trước khi lưu.");
        }
        await wardrobeApi.recordConsent();
        await wardrobeApi.uploadImage(item.id, pendingFile);
      }

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      setShowAdd(false);
      resetForm();
    },
    onError: (err: unknown) => {
      setFormError(getUserErrorMessage(err, { fallback: "Không thể lưu item. Vui lòng thử lại." }));
    },
  });

  const canSave =
    form.itemType.trim().length > 0 &&
    form.category.length > 0 &&
    !createMutation.isPending &&
    (!pendingFile || consented);

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Tủ đồ cá nhân"
        subtitle="Thêm đồ đang có để AI ưu tiên phối từ wardrobe"
        backHref="/"
        backLabel="Trang chủ"
        trailing={
          <Button
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="h-8 shrink-0 rounded-full px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Thêm item
          </Button>
        }
      />

      <div>
        {(!sessionReady || isLoading) && <LoadingSkeleton />}
        {error && <ErrorState onRetry={() => refetch()} />}
        {sessionReady && data && data.length === 0 && (
          <EmptyState
            title="Tủ đồ trống"
            description="Thêm item thủ công hoặc upload ảnh để AI phối đồ từ những gì bạn đã có."
            actionLabel="Thêm item thủ công"
            onAction={() => {
              resetForm();
              setShowAdd(true);
            }}
          />
        )}
        {data && data.length > 0 && (
          <div className={catalogProductGridClass}>
            {data.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      <AppImage src={item.imageUrl} alt={item.itemType} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground/70">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 font-medium">{item.itemType}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.category}
                    {item.color ? ` · ${item.color}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.styleTags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm item vào tủ đồ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wardrobe-item-name">Tên item</Label>
              <Input
                id="wardrobe-item-name"
                value={form.itemType}
                onChange={(e) => setForm({ ...form, itemType: e.target.value })}
                className="mt-1"
                placeholder="VD: Áo thun trắng"
              />
            </div>
            <div>
              <Label htmlFor="wardrobe-item-category">Danh mục</Label>
              <select
                id="wardrobe-item-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Chọn</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="wardrobe-item-color">Màu (tùy chọn)</Label>
              <Input
                id="wardrobe-item-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="mt-1"
                placeholder="VD: Trắng"
              />
            </div>
            <div>
              <Label htmlFor="wardrobe-item-image">Ảnh item (tùy chọn)</Label>
              <input
                ref={fileRef}
                id="wardrobe-item-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setPendingFile(null);
                    return;
                  }
                  const validationError = validateImageFile(file);
                  if (validationError) {
                    setFormError(validationError);
                    setPendingFile(null);
                    e.target.value = "";
                    return;
                  }
                  setFormError(null);
                  setPendingFile(file);
                }}
              />
            </div>
            {pendingFile && (
              <label className="flex items-center gap-2">
                <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
                <span className="text-sm">Đồng ý upload ảnh item</span>
              </label>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button className="w-full" disabled={!canSave} onClick={() => createMutation.mutate()}>
              <Upload className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Đang lưu..." : "Lưu item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
