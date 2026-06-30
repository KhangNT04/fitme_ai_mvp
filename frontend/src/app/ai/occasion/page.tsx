"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { occasionSchema, type OccasionForm } from "@/utils/validators";
import { OCCASION_OPTIONS, VIBE_OPTIONS, WARDROBE_MODES } from "@/utils/constants";
import { useConsultationStore } from "@/stores/consultation-store";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Chip } from "@/components/ui/chip";
import { consumerPageShellClass } from "@/lib/design-tokens";

export default function OccasionPage() {
  const router = useRouter();
  const { setOccasionRequest, setWardrobeMode } = useConsultationStore();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OccasionForm>({
    resolver: zodResolver(occasionSchema),
    defaultValues: { wardrobeMode: "MIX_WARDROBE_AND_BRAND" },
  });

  const occasion = watch("occasion");
  const desiredVibe = watch("desiredVibe");
  const wardrobeMode = watch("wardrobeMode");

  const onSubmit = (data: OccasionForm) => {
    setOccasionRequest({
      ...(data.occasion ? { occasion: data.occasion } : {}),
      ...(data.desiredVibe ? { desiredVibe: data.desiredVibe } : {}),
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
    });
    setWardrobeMode(data.wardrobeMode);
    router.push("/ai/processing");
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={AI_FLOW_STEPS}
        currentStep={3}
        title="Hoàn cảnh & vibe"
        subtitle="Bạn sẽ mặc outfit này ở đâu?"
        showAiBadge
        backHref="/ai/style-profile"
        backLabel="Gu thời trang"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Hoàn cảnh (tùy chọn)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    selected={occasion === o}
                    onClick={() => setValue("occasion", o, { shouldValidate: true })}
                  >
                    {o}
                  </Chip>
                ))}
              </div>
              {errors.occasion && <p className="mt-1 text-xs text-red-600">{errors.occasion.message}</p>}
            </div>

            <div>
              <Label>Vibe mong muốn (tùy chọn)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((v) => (
                  <Chip
                    key={v}
                    selected={desiredVibe === v}
                    onClick={() => setValue("desiredVibe", v, { shouldValidate: true })}
                  >
                    {v}
                  </Chip>
                ))}
              </div>
              {errors.desiredVibe && <p className="mt-1 text-xs text-red-600">{errors.desiredVibe.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Label>Ngân sách (tùy chọn)</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="number" placeholder="Tối thiểu (VND)" {...register("budgetMin", {
                setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })} />
              <Input type="number" placeholder="Tối đa (VND)" {...register("budgetMax", {
                setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
              })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label>Sử dụng tủ đồ</Label>
            <Select
              value={wardrobeMode}
              onValueChange={(v) => setValue("wardrobeMode", v as OccasionForm["wardrobeMode"])}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WARDROBE_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/ai/style-profile">Quay lại</Link>
          </Button>
          <Button type="submit" className="flex-1" variant="ai">Tạo gợi ý outfit</Button>
        </div>
      </form>
    </PageShell>
  );
}
