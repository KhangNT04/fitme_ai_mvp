"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { bodyProfileSchema, type BodyProfileForm } from "@/utils/validators";
import { FIT_PREFERENCES, SKIN_TONES } from "@/utils/constants";
import { useConsultationStore } from "@/stores/consultation-store";
import type { BodyProfile } from "@/types/user";

const GOAL_OPTIONS = [
  "Tổng thể cân đối hơn",
  "Tạo cảm giác gọn hơn",
  "Thoải mái hơn",
  "Tạo hiệu ứng kéo dài dáng",
  "Nổi bật hơn",
];

export default function BodyProfilePage() {
  const router = useRouter();
  const { setBodyProfile } = useConsultationStore();
  const [showMeasurements, setShowMeasurements] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BodyProfileForm>({
    resolver: zodResolver(bodyProfileSchema),
    defaultValues: { goals: [], fitPreference: "REGULAR", skinTone: "MEDIUM" },
  });

  const goals = watch("goals") || [];

  const toggleGoal = (goal: string) => {
    const next = goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal];
    setValue("goals", next, { shouldValidate: true });
  };

  const onSubmit = (data: BodyProfileForm) => {
    const profile: BodyProfile = {
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      fitPreference: data.fitPreference,
      skinTone: data.skinTone,
      goals: data.goals,
      measurements: {
        shoulderWidthCm: data.shoulderWidthCm,
        chestCm: data.chestCm,
        waistCm: data.waistCm,
        abdomenCm: data.abdomenCm,
        hipCm: data.hipCm,
        thighCm: data.thighCm,
        inseamCm: data.inseamCm,
        armLengthCm: data.armLengthCm,
      },
    };
    setBodyProfile(profile);
    router.push("/ai/style-profile");
  };

  return (
    <PageShell>
      <PageHeader
        steps={AI_FLOW_STEPS}
        currentStep={1}
        title="Thông tin cơ thể"
        subtitle="Giúp AI gợi ý size và form phù hợp với bạn"
        showAiBadge
        backHref="/ai/start"
        backLabel="Bắt đầu tư vấn"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Số đo cơ bản</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="heightCm">Chiều cao (cm)</Label>
              <Input id="heightCm" type="number" {...register("heightCm", { valueAsNumber: true })} className="mt-1" />
              {errors.heightCm && <p className="mt-1 text-xs text-red-600">{errors.heightCm.message}</p>}
            </div>
            <div>
              <Label htmlFor="weightKg">Cân nặng (kg)</Label>
              <Input id="weightKg" type="number" {...register("weightKg", { valueAsNumber: true })} className="mt-1" />
              {errors.weightKg && <p className="mt-1 text-xs text-red-600">{errors.weightKg.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label>Gu mặc</Label>
              <Select onValueChange={(v) => setValue("fitPreference", v as BodyProfileForm["fitPreference"])}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {FIT_PREFERENCES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tông da</Label>
              <Select onValueChange={(v) => setValue("skinTone", v as BodyProfileForm["skinTone"])}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {SKIN_TONES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Số đo chi tiết (tùy chọn)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMeasurements((v) => !v)}>
              {showMeasurements ? "Ẩn" : "Mở rộng"}
            </Button>
          </CardHeader>
          {showMeasurements && (
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <Input id={field} type="number" {...register(field, { valueAsNumber: true })} className="mt-1" />
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Mục tiêu phong cách</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {GOAL_OPTIONS.map((goal) => (
              <label key={goal} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={goals.includes(goal)} onCheckedChange={() => toggleGoal(goal)} />
                <span className="text-sm">{goal}</span>
              </label>
            ))}
            {errors.goals && <p className="text-xs text-red-600">{errors.goals.message}</p>}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/ai/start">Quay lại</Link>
          </Button>
          <Button type="submit" className="flex-1">Tiếp tục</Button>
        </div>
      </form>
    </PageShell>
  );
}
