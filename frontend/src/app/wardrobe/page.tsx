"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppImage } from "@/components/common/AppImage";
import { validateImageFile } from "@/lib/upload-file";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { wardrobeApi } from "@/services/wardrobe-api";
import { entitlementApi } from "@/services/entitlement-api";
import { PREMIUM_PERKS, PREMIUM_PLAN_NAME, premiumUpgradeCta } from "@/lib/premium";
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
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { CollapsingPageHeader } from "@/components/layout/CollapsingPageHeader";
import { PRODUCT_CATEGORIES } from "@/utils/constants";
import { catalogProductGridClass, consumerPageShellClass } from "@/lib/design-tokens";
import { getUserErrorMessage, isPremiumRequiredError } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import type { WardrobeItem } from "@/types/user";

const EMPTY_FORM = {
  itemType: "",
  category: "",
  color: "",
  fit: "",
  styleTags: "",
};

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { ensureSession } = useEnsureSession();
  const [sessionReady, setSessionReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WardrobeItem | null>(null);
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
    setEditingItem(null);
    setPendingFile(null);
    setConsented(false);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = (item: WardrobeItem) => {
    resetForm();
    setEditingItem(item);
    setForm({
      itemType: item.itemType,
      category: item.category,
      color: item.color,
      fit: item.fit ?? "",
      styleTags: item.styleTags.join(", "),
    });
    setShowAdd(true);
  };

  const {
    data: entitlement,
    isLoading: entitlementLoading,
    error: entitlementError,
    refetch: refetchEntitlement,
  } = useQuery({
    queryKey: ["consumer-entitlement"],
    queryFn: () => entitlementApi.get(),
    staleTime: 60_000,
    enabled: sessionReady,
  });
  const premium = entitlement?.premium ?? false;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: () => wardrobeApi.list(),
    enabled: sessionReady && premium,
    retry: (failureCount, err) => !isPremiumRequiredError(err) && failureCount < 2,
  });
  const locked = (entitlement !== undefined && !premium) || isPremiumRequiredError(error);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const session = await ensureSession();
      if (!session) throw new Error("Không thể khởi tạo phiên. Vui lòng thử lại.");

      const payload = {
        itemType: form.itemType.trim(),
        category: form.category,
        color: form.color.trim(),
        fit: form.fit.trim() || undefined,
        styleTags: form.styleTags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const item = editingItem
        ? await wardrobeApi.update(editingItem.id, { ...payload, material: editingItem.material })
        : await wardrobeApi.create(payload);

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
      if (editingItem) toast.success("Đã cập nhật item");
      setShowAdd(false);
      resetForm();
    },
    onError: (err: unknown) => {
      setFormError(getUserErrorMessage(err, { fallback: "Không thể lưu item. Vui lòng thử lại." }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wardrobeApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
      toast.success("Đã xóa item khỏi tủ đồ");
      setPendingDelete(null);
    },
    onError: (err: unknown) => {
      toast.error(getUserErrorMessage(err, "Không xóa được item. Vui lòng thử lại."));
    },
  });

  const canSave =
    form.itemType.trim().length > 0 &&
    form.category.length > 0 &&
    !saveMutation.isPending &&
    (!pendingFile || consented);

  const categoryOptions: string[] = [...PRODUCT_CATEGORIES];
  if (form.category && !categoryOptions.includes(form.category)) {
    categoryOptions.unshift(form.category);
  }

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <CollapsingPageHeader
        title="Tủ đồ cá nhân"
        subtitle="Thêm đồ đang có để AI ưu tiên phối từ wardrobe"
        backHref="/"
        backLabel="Trang chủ"
        trailing={
          locked ? undefined : (
            <Button
              onClick={() => {
                resetForm();
                setShowAdd(true);
              }}
              disabled={!premium}
              className="h-8 shrink-0 rounded-full px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Thêm item
            </Button>
          )
        }
      />

      <div>
        {locked && <WardrobePremiumUpsell priceVnd={entitlement?.premiumPriceVnd} />}
        {!locked && (!sessionReady || entitlementLoading || isLoading) && <LoadingSkeleton />}
        {!locked && (error || entitlementError) && (
          <ErrorState onRetry={() => void (entitlementError ? refetchEntitlement() : refetch())} />
        )}
        {!locked && sessionReady && data && data.length === 0 && (
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
        {!locked && data && data.length > 0 && (
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
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(item)}
                      aria-label={`Sửa ${item.itemType}`}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Xóa ${item.itemType}`}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Xóa
                    </Button>
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
            <DialogTitle>{editingItem ? "Sửa item trong tủ đồ" : "Thêm item vào tủ đồ"}</DialogTitle>
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
                {categoryOptions.map((c) => (
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
              <Label htmlFor="wardrobe-item-image">
                {editingItem?.imageUrl ? "Thay ảnh item (tùy chọn)" : "Ảnh item (tùy chọn)"}
              </Label>
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
            <Button className="w-full" disabled={!canSave} onClick={() => saveMutation.mutate()}>
              <Upload className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Lưu item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Xóa item khỏi tủ đồ?"
        description={
          pendingDelete
            ? `"${pendingDelete.itemType}" và ảnh đi kèm sẽ bị xóa vĩnh viễn khỏi tủ đồ của bạn.`
            : ""
        }
        confirmLabel="Xóa"
        cancelLabel="Giữ lại"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </PageShell>
  );
}

function WardrobePremiumUpsell({ priceVnd }: { priceVnd?: number | null }) {
  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="wardrobe-premium-upsell">
      <CardContent className="space-y-4 p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Tủ đồ là tính năng của {PREMIUM_PLAN_NAME}</h2>
          <p className="text-sm text-muted-foreground">
            Lưu đồ bạn đang có để stylist AI phối kèm với sản phẩm từ các brand. Dữ liệu tủ đồ cũ của bạn vẫn được giữ nguyên.
          </p>
        </div>
        <ul className="mx-auto max-w-sm space-y-1 text-left text-sm">
          {PREMIUM_PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {perk}
            </li>
          ))}
        </ul>
        <Button asChild className="rounded-full">
          <Link href="/pricing">{premiumUpgradeCta(priceVnd)}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
