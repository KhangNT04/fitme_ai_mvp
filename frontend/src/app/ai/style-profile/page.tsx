"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { styleProfileSchema, type StyleProfileForm } from "@/utils/validators";
import { RISK_LEVELS, STYLE_OPTIONS } from "@/utils/constants";
import { useConsultationStore } from "@/stores/consultation-store";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AI_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Chip } from "@/components/ui/chip";

const COLOR_OPTIONS = ["Đen", "Trắng", "Navy", "Beige", "Nâu", "Xám", "Pastel", "Đỏ", "Xanh lá"];

export default function StyleProfilePage() {
  const router = useRouter();
  const { setStyleProfile } = useConsultationStore();
  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<StyleProfileForm>({
    resolver: zodResolver(styleProfileSchema),
    defaultValues: {
      secondaryStyles: [],
      preferredColors: [],
      avoidedColors: [],
      riskLevel: "BALANCED",
      artisticMode: false,
    },
  });

  const primaryStyle = watch("primaryStyle");
  const preferredColors = watch("preferredColors") || [];
  const artisticMode = watch("artisticMode");

  const toggleColor = (color: string) => {
    const next = preferredColors.includes(color)
      ? preferredColors.filter((c) => c !== color)
      : [...preferredColors, color];
    setValue("preferredColors", next, { shouldValidate: true });
  };

  const onSubmit = (data: StyleProfileForm) => {
    setStyleProfile(data);
    router.push("/ai/occasion");
  };

  return (
    <PageShell>
      <PageHeader
        steps={AI_FLOW_STEPS}
        currentStep={2}
        title="Gu thời trang"
        subtitle="Chọn phong cách và màu sắc bạn yêu thích"
        showAiBadge
        backHref="/ai/body-profile"
        backLabel="Thông tin cơ thể"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Phong cách chính</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => (
              <Chip
                key={style}
                selected={primaryStyle === style}
                onClick={() => setValue("primaryStyle", style, { shouldValidate: true })}
              >
                {style}
              </Chip>
            ))}
            {errors.primaryStyle && <p className="w-full text-xs text-red-600">{errors.primaryStyle.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Label>Mức độ thử nghiệm</Label>
            <Select onValueChange={(v) => setValue("riskLevel", v as StyleProfileForm["riskLevel"])} defaultValue="BALANCED">
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
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
          <CardHeader><CardTitle className="text-base">Màu ưa thích</CardTitle></CardHeader>
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
            {errors.preferredColors && <p className="w-full text-xs text-red-600">{errors.preferredColors.message}</p>}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/ai/body-profile">Quay lại</Link>
          </Button>
          <Button type="submit" className="flex-1">Tiếp tục</Button>
        </div>
      </form>
    </PageShell>
  );
}
