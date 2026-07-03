"use client";

import { useEffect, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { styleProfileSchema, type StyleProfileForm } from "@/utils/validators";
import { RISK_LEVELS, STYLE_OPTIONS } from "@/utils/constants";
import { profileSnapshotKey } from "@/lib/form-number";
import type { StyleProfile } from "@/types/user";

const COLOR_OPTIONS = ["Đen", "Trắng", "Navy", "Beige", "Nâu", "Xám", "Pastel", "Đỏ", "Xanh lá"];
const NONE = "__none__";

export function formToStyleProfile(data: StyleProfileForm): StyleProfile {
  const profile: StyleProfile = {};
  if (data.primaryStyle) profile.primaryStyle = data.primaryStyle;
  if (data.secondaryStyles !== undefined) profile.secondaryStyles = data.secondaryStyles;
  if (data.riskLevel !== undefined) profile.riskLevel = data.riskLevel;
  if (data.artisticMode !== undefined) profile.artisticMode = data.artisticMode;
  if (data.preferredColors !== undefined) profile.preferredColors = data.preferredColors;
  if (data.avoidedColors !== undefined) profile.avoidedColors = data.avoidedColors;
  return profile;
}

interface StyleProfileEditorProps {
  initial?: StyleProfile | null;
  onSubmit: (data: StyleProfileForm) => void | Promise<void>;
  submitLabel?: string;
  footer?: React.ReactNode;
  saving?: boolean;
}

export function StyleProfileEditor({
  initial,
  onSubmit,
  submitLabel = "Lưu thay đổi",
  footer,
  saving,
}: StyleProfileEditorProps) {
  const { handleSubmit, setValue, watch, reset } = useForm<StyleProfileForm>({
    resolver: zodResolver(styleProfileSchema) as Resolver<StyleProfileForm>,
    defaultValues: {
      secondaryStyles: [],
      preferredColors: [],
      avoidedColors: [],
      artisticMode: false,
    },
  });

  const lastInitialSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    const formValues = {
      primaryStyle: initial.primaryStyle || undefined,
      secondaryStyles: initial.secondaryStyles ?? [],
      preferredColors: initial.preferredColors ?? [],
      avoidedColors: initial.avoidedColors ?? [],
      riskLevel: initial.riskLevel ?? undefined,
      artisticMode: initial.artisticMode ?? false,
    };
    const snapshot = profileSnapshotKey(formValues);
    if (snapshot === lastInitialSnapshot.current) return;
    lastInitialSnapshot.current = snapshot;
    reset(formValues);
  }, [initial, reset]);

  const primaryStyle = watch("primaryStyle");
  const preferredColors = watch("preferredColors") || [];
  const artisticMode = watch("artisticMode");
  const riskLevel = watch("riskLevel");

  const togglePrimaryStyle = (style: string) => {
    setValue("primaryStyle", primaryStyle === style ? undefined : style);
  };

  const toggleColor = (color: string) => {
    const next = preferredColors.includes(color)
      ? preferredColors.filter((c) => c !== color)
      : [...preferredColors, color];
    setValue("preferredColors", next, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Phong cách chính (tùy chọn)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((style) => (
            <Chip
              key={style}
              selected={primaryStyle === style}
              onClick={() => togglePrimaryStyle(style)}
            >
              {style}
            </Chip>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mức độ thử nghiệm (tùy chọn)</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0">
          <Label>Mức rủi ro phong cách</Label>
          <Select
            value={riskLevel ?? NONE}
            onValueChange={(v) =>
              setValue("riskLevel", v === NONE ? undefined : (v as StyleProfileForm["riskLevel"]))
            }
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Chưa chọn" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Chưa chọn</SelectItem>
              {RISK_LEVELS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="mt-4 flex items-center gap-2">
            <Checkbox checked={artisticMode} onCheckedChange={(c) => setValue("artisticMode", !!c)} />
            <span className="text-sm">Chế độ nghệ thuật (outfit sáng tạo hơn)</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Màu ưa thích (tùy chọn)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <Chip
              key={color}
              selected={preferredColors.includes(color)}
              onClick={() => toggleColor(color)}
            >
              {color}
            </Chip>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {footer}
        <Button type="submit" className="min-h-11 flex-1 rounded-full sm:flex-none sm:px-8" disabled={saving}>
          {saving ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
