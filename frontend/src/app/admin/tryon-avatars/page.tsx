"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { adminApi, type TryOnAvatarUpsert } from "@/services/admin-api";
import type { TryOnAvatar } from "@/types/tryon";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { PortalActionButton, PortalActionGroup } from "@/components/portal/PortalActionButton";
import { BrandImageUpload } from "@/components/brand/BrandImageUpload";
import { AppImage } from "@/components/common/AppImage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actionFeedback } from "@/lib/action-feedback";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["admin-tryon-avatars"];

type EditorState = { mode: "create" } | { mode: "edit"; avatar: TryOnAvatar };

export default function AdminTryOnAvatarsPage() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [label, setLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TryOnAvatar | null>(null);

  const { data: avatars = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminApi.listTryOnAvatars(),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["tryon-avatars"] });
  };

  const openEditor = (state: EditorState) => {
    setEditor(state);
    setLabel(state.mode === "edit" ? state.avatar.label : "");
    setImageUrl(state.mode === "edit" ? state.avatar.imageUrl : "");
    setActive(state.mode === "edit" ? state.avatar.active : true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: TryOnAvatarUpsert) =>
      editor?.mode === "edit"
        ? adminApi.updateTryOnAvatar(editor.avatar.id, data)
        : adminApi.createTryOnAvatar(data),
    onSuccess: (avatar) => {
      const created = editor?.mode === "create";
      setEditor(null);
      refresh();
      actionFeedback({
        successMessage: created ? `Đã thêm avatar "${avatar.label}"` : `Đã cập nhật avatar "${avatar.label}"`,
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể lưu avatar mẫu" }).onError,
  });

  const toggleMutation = useMutation({
    mutationFn: (avatar: TryOnAvatar) => adminApi.updateTryOnAvatar(avatar.id, { active: !avatar.active }),
    onSuccess: (avatar) => {
      refresh();
      actionFeedback({
        successMessage: avatar.active ? `Đã hiển thị "${avatar.label}"` : `Đã ẩn "${avatar.label}"`,
      }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể đổi trạng thái hiển thị" }).onError,
  });

  const moveMutation = useMutation({
    mutationFn: ({ avatar, direction }: { avatar: TryOnAvatar; direction: "UP" | "DOWN" }) =>
      adminApi.moveTryOnAvatar(avatar.id, direction),
    onSuccess: (ordered) => {
      queryClient.setQueryData(QUERY_KEY, ordered);
      refresh();
    },
    onError: actionFeedback({ errorMessage: "Không thể sắp xếp lại" }).onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (avatar: TryOnAvatar) => adminApi.deleteTryOnAvatar(avatar.id),
    onSuccess: (_, avatar) => {
      setDeleteTarget(null);
      refresh();
      actionFeedback({ successMessage: `Đã xóa "${avatar.label}"` }).onSuccess();
    },
    onError: actionFeedback({ errorMessage: "Không thể xóa avatar mẫu" }).onError,
  });

  const visibleCount = avatars.filter((a) => a.active).length;
  const canSave = label.trim().length > 0 && imageUrl.length > 0 && !saveMutation.isPending;

  return (
    <PortalAdminPage
      title="Avatar mẫu thử đồ"
      description="Quản lý các hình mẫu người dùng chọn ở chế độ “Dùng avatar mẫu” khi thử đồ bằng AI. Nên dùng ảnh toàn thân, đứng thẳng, nền trơn, tỉ lệ khoảng 2:3."
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton="list"
      headerActions={
        <Button onClick={() => openEditor({ mode: "create" })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Thêm avatar mẫu
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {avatars.length} avatar · {visibleCount} đang hiển thị cho người dùng. Thứ tự bên dưới là thứ tự hiển thị.
        </p>

        {avatars.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Chưa có avatar mẫu nào — người dùng sẽ không chọn được chế độ avatar mẫu.
          </p>
        ) : (
          <div
            className={cn(
              "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              isFetching && "opacity-70 transition-opacity",
            )}
          >
            {avatars.map((avatar, index) => (
              <div
                key={avatar.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
                  !avatar.active && "opacity-60",
                )}
              >
                <div className="relative aspect-[2/3] bg-muted">
                  <AppImage
                    src={avatar.imageUrl}
                    alt={avatar.label}
                    fill
                    className="object-cover object-top"
                    sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    #{index + 1}
                  </span>
                  <Badge variant={avatar.active ? "success" : "warning"} className="absolute right-2 top-2">
                    {avatar.active ? "Hiển thị" : "Đang ẩn"}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{avatar.label}</span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Đưa ${avatar.label} lên trước`}
                        disabled={index === 0 || moveMutation.isPending}
                        onClick={() => moveMutation.mutate({ avatar, direction: "UP" })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Đưa ${avatar.label} xuống sau`}
                        disabled={index === avatars.length - 1 || moveMutation.isPending}
                        onClick={() => moveMutation.mutate({ avatar, direction: "DOWN" })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <PortalActionGroup className="flex-wrap">
                    <PortalActionButton variant="edit" hideIcon onClick={() => openEditor({ mode: "edit", avatar })}>
                      Sửa
                    </PortalActionButton>
                    <PortalActionButton
                      variant={avatar.active ? "suspend" : "approve"}
                      hideIcon
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(avatar)}
                    >
                      {avatar.active ? "Ẩn" : "Hiện"}
                    </PortalActionButton>
                    <PortalActionButton variant="suspend" hideIcon onClick={() => setDeleteTarget(avatar)}>
                      Xóa
                    </PortalActionButton>
                  </PortalActionGroup>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor?.mode === "edit" ? "Sửa avatar mẫu" : "Thêm avatar mẫu"}</DialogTitle>
            <DialogDescription>
              Ảnh sẽ được AI dùng làm người mẫu để ghép trang phục, nên chọn ảnh rõ nét, thấy toàn thân.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSave) saveMutation.mutate({ label: label.trim(), imageUrl, active });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="avatar-label">Tên hiển thị</Label>
              <Input
                id="avatar-label"
                value={label}
                maxLength={80}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ví dụ: Nam 3"
              />
            </div>
            <BrandImageUpload
              label="Ảnh người mẫu"
              hint="JPG, PNG hoặc WEBP, tối đa 5MB."
              aspect="portrait"
              value={imageUrl || null}
              onChange={setImageUrl}
              onUpload={adminApi.uploadTryOnAvatarImage}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={active} onCheckedChange={(checked) => setActive(!!checked)} />
              Hiển thị cho người dùng
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditor(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={!canSave}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa avatar mẫu?"
        description={`"${deleteTarget?.label ?? ""}" sẽ biến mất khỏi danh sách chọn của người dùng. Nếu chỉ muốn tạm ngừng, hãy dùng nút Ẩn.`}
        confirmLabel="Xóa"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </PortalAdminPage>
  );
}
