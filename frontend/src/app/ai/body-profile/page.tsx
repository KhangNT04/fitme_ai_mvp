"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { bodyProfileSchema, type BodyProfileForm } from "@/utils/validators";
import { FIT_PREFERENCES, SKIN_TONES } from "@/utils/constants";
import { useConsultationStore } from "@/stores/consultation-store";

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
    setBodyProfile(data);
    router.push("/ai/style-profile");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Thông tin cơ thể</h1>
      <p className="mt-2 text-stone-500">Giúp AI gợi ý size và form phù hợp với bạn</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
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
          <Button type="button" variant="outline" onClick={() => router.back()}>Quay lại</Button>
          <Button type="submit" className="flex-1">Tiếp tục</Button>
        </div>
      </form>
    </div>
  );
}
