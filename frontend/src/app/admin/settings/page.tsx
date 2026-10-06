"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PortalAdminPage } from "@/components/portal/PortalAdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalCardClass } from "@/lib/design-tokens";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";
import {
  SYSTEM_SETTINGS_QUERY_KEY,
  settingsApi,
  validateSettingValue,
  type SystemSetting,
} from "@/services/settings-api";

export default function AdminSystemSettingsPage() {
  const settingsQuery = useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: () => settingsApi.list(),
  });
  const settings = settingsQuery.data ?? [];

  return (
    <PortalAdminPage
      title="Cài đặt hệ thống"
      description="Điều chỉnh các thông số vận hành. Thay đổi có hiệu lực trong vòng một phút."
      isLoading={settingsQuery.isLoading}
      error={settingsQuery.error}
      onRetry={() => void settingsQuery.refetch()}
      empty={settings.length === 0}
      emptyTitle="Chưa có cài đặt"
      emptyDescription="Không tải được danh sách cài đặt hệ thống."
      skeleton="card"
    >
      <div className="grid gap-4">
        {settings.map((setting) => (
          <SettingForm key={`${setting.key}:${setting.value}:${setting.updatedAt ?? ""}`} setting={setting} />
        ))}
      </div>
    </PortalAdminPage>
  );
}

function SettingForm({ setting }: { setting: SystemSetting }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(setting.value));
  const [error, setError] = useState<string | null>(null);
  const inputId = `setting-${setting.key.replace(/[^a-z0-9]/gi, "-")}`;

  const save = useMutation({
    mutationFn: (raw: string) => settingsApi.update(setting.key, raw.trim()),
    onSuccess: (updated) => {
      toast.success(`Đã lưu "${updated.label}": ${updated.value}`);
      void queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_QUERY_KEY });
    },
    onError: (err) => {
      const message = getUserErrorMessage(err, "Không lưu được cài đặt");
      setError(message);
      toast.error(message);
    },
  });

  const dirty = value.trim() !== String(setting.value);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateSettingValue(setting, value);
    setError(validation);
    if (validation) return;
    save.mutate(value);
  };

  return (
    <form onSubmit={submit} className={`${portalCardClass} space-y-3 p-4`} aria-label={setting.label}>
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-sm font-semibold">
          {setting.label}
        </Label>
        <p className="text-xs text-muted-foreground">{setting.description}</p>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-40 space-y-1">
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={setting.min}
            max={setting.max}
            step={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${inputId}-hint`}
          />
          <p id={`${inputId}-hint`} className="text-[11px] text-muted-foreground">
            Từ {setting.min} đến {setting.max} · mặc định {setting.defaultValue}
          </p>
        </div>
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Mã: <code>{setting.key}</code>
        {setting.updatedAt ? ` · Cập nhật ${new Date(setting.updatedAt).toLocaleString("vi-VN")}` : ""}
      </p>
    </form>
  );
}
