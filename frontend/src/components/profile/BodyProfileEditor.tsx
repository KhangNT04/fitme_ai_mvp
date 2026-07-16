"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bodyProfileSchema, type BodyProfileForm } from "@/utils/validators";
import { FIT_PREFERENCES, GENDERS } from "@/utils/constants";
import {
  optionalNumberRegisterOptions,
  profileSnapshotKey,
  requiredNumberRegisterOptions,
} from "@/lib/form-number";
import { cn } from "@/lib/utils";
import { SkinTonePicker } from "@/components/ui/skin-tone-picker";
import type { BodyProfile } from "@/types/user";

export function bodyProfileToForm(profile: BodyProfile): BodyProfileForm {
  return {
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    age: profile.age ?? 25,
    gender: profile.gender,
    fitPreference: profile.fitPreference ?? "REGULAR",
    skinTone: profile.skinTone,
    goals: profile.goals ?? [],
    shoulderWidthCm: profile.measurements?.shoulderWidthCm,
    chestCm: profile.measurements?.chestCm,
    waistCm: profile.measurements?.waistCm,
    abdomenCm: profile.measurements?.abdomenCm,
    hipCm: profile.measurements?.hipCm,
    thighCm: profile.measurements?.thighCm,
    inseamCm: profile.measurements?.inseamCm,
    armLengthCm: profile.measurements?.armLengthCm,
  };
}

export function formToBodyProfile(data: BodyProfileForm): BodyProfile {
  const rawMeasurements = {
    shoulderWidthCm: data.shoulderWidthCm,
    chestCm: data.chestCm,
    waistCm: data.waistCm,
    abdomenCm: data.abdomenCm,
    hipCm: data.hipCm,
    thighCm: data.thighCm,
    inseamCm: data.inseamCm,
    armLengthCm: data.armLengthCm,
  };
  const measurements = Object.fromEntries(
    Object.entries(rawMeasurements).filter(([, v]) => v != null && !Number.isNaN(v)),
  ) as BodyProfile["measurements"];

  return {
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    age: data.age,
    gender: data.gender,
    ...(data.fitPreference !== undefined ? { fitPreference: data.fitPreference } : {}),
    ...(data.skinTone !== undefined ? { skinTone: data.skinTone } : {}),
    ...(data.goals !== undefined ? { goals: data.goals } : {}),
    ...(measurements && Object.keys(measurements).length > 0 ? { measurements } : {}),
  };
}

interface BodyProfileEditorProps {
  initial?: BodyProfile | null;
  onSubmit: (data: BodyProfileForm) => void | Promise<void>;
  submitLabel?: string;
  footer?: React.ReactNode;
  saving?: boolean;
}

export function BodyProfileEditor({
  initial,
  onSubmit,
  submitLabel = "Lưu thay đổi",
  footer,
  saving,
}: BodyProfileEditorProps) {
  const formValues = useMemo((): BodyProfileForm => {
    if (!initial) {
      return {
        heightCm: 165,
        weightKg: 55,
        age: 25,
        gender: "FEMALE" as const,
        fitPreference: "REGULAR" as const,
        goals: [],
      };
    }
    return bodyProfileToForm(initial);
  }, [initial ? profileSnapshotKey(bodyProfileToForm(initial)) : "empty"]);

  const [showMeasurements, setShowMeasurements] = useState(
    () => !!initial?.measurements && Object.values(initial.measurements).some((v) => v != null),
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BodyProfileForm>({
    resolver: zodResolver(bodyProfileSchema) as Resolver<BodyProfileForm>,
    values: formValues,
  });

  useEffect(() => {
    if (initial?.measurements && Object.values(initial.measurements).some((v) => v != null)) {
      setShowMeasurements(true);
    }
  }, [initial]);
  const gender = watch("gender");
  const fitPreference = watch("fitPreference");
  const skinTone = watch("skinTone");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Số đo cơ bản</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="heightCm">Chiều cao (cm)</Label>
            <Input id="heightCm" type="number" step="1" {...register("heightCm", requiredNumberRegisterOptions)} className="mt-1" />
            {errors.heightCm && <p className="mt-1 text-xs text-red-600">{errors.heightCm.message}</p>}
          </div>
          <div>
            <Label htmlFor="weightKg">Cân nặng (kg)</Label>
            <Input id="weightKg" type="number" step="0.1" {...register("weightKg", requiredNumberRegisterOptions)} className="mt-1" />
            {errors.weightKg && <p className="mt-1 text-xs text-red-600">{errors.weightKg.message}</p>}
          </div>
          <div>
            <Label htmlFor="age">Tuổi</Label>
            <Input id="age" type="number" step="1" {...register("age", requiredNumberRegisterOptions)} className="mt-1" />
            {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label>Giới tính</Label>
            <Select
              value={gender ?? ""}
              onValueChange={(v) => setValue("gender", v as BodyProfileForm["gender"], { shouldValidate: true })}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label>Gu mặc (form)</Label>
            <Select
              value={fitPreference ?? ""}
              onValueChange={(v) =>
                setValue("fitPreference", v as BodyProfileForm["fitPreference"], { shouldValidate: true })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn gu mặc" /></SelectTrigger>
              <SelectContent>
                {FIT_PREFERENCES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fitPreference && <p className="mt-1 text-xs text-red-600">{errors.fitPreference.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Thông tin bổ sung (tùy chọn)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tông da</Label>
            <SkinTonePicker
              value={skinTone}
              onChange={(v) => setValue("skinTone", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Số đo chi tiết (tùy chọn)</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Có thể điền một vài mục hoặc bỏ qua toàn bộ.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setShowMeasurements((v) => !v)}>
            {showMeasurements ? "Ẩn" : "Mở rộng"}
          </Button>
        </CardHeader>
        <CardContent className={cn("grid gap-4 sm:grid-cols-2", !showMeasurements && "hidden")}>
          {([
            ["shoulderWidthCm", "Vai (cm)"],
            ["chestCm", "Ngực (cm)"],
            ["waistCm", "Eo (cm)"],
            ["abdomenCm", "Bụng (cm)"],
            ["hipCm", "Hông (cm)"],
            ["thighCm", "Đùi (cm)"],
            ["inseamCm", "Inseam (cm)"],
            ["armLengthCm", "Tay (cm)"],
          ] as const).map(([field, label]) => (
            <div key={field}>
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                type="number"
                step="0.1"
                {...register(field, optionalNumberRegisterOptions)}
                className="mt-1"
              />
              {errors[field] && (
                <p className="mt-1 text-xs text-red-600">{errors[field]?.message}</p>
              )}
            </div>
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
