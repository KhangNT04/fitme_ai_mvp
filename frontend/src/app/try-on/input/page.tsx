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
import { tryOnInputSchema, type TryOnInputForm } from "@/utils/validators";
import { FIT_PREFERENCES, SKIN_TONES, OCCASION_OPTIONS, VIBE_OPTIONS } from "@/utils/constants";
import { useTryOnStore } from "@/stores/tryon-store";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { tryonApi } from "@/services/tryon-api";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { Chip } from "@/components/ui/chip";

const INPUT_MODES = [
  { value: "USER_PHOTO", label: "Dùng ảnh cá nhân" },
  { value: "AVATAR", label: "Dùng avatar mẫu" },
  { value: "OUTFIT_BOARD_ONLY", label: "Chỉ xem outfit board" },
] as const;

export default function TryOnInputPage() {
  const router = useRouter();
  const { selectedItems, setInput, setRequestId } = useTryOnStore();
  const { ensureSession } = useEnsureSession();
  const { register, handleSubmit, setValue, watch } = useForm<TryOnInputForm>({
    resolver: zodResolver(tryOnInputSchema),
    defaultValues: { inputMode: "OUTFIT_BOARD_ONLY", fitPreference: "REGULAR", skinTone: "MEDIUM" },
  });

  const inputMode = watch("inputMode");

  const onSubmit = async (data: TryOnInputForm) => {
    setInput(data);
    const session = await ensureSession();
    if (!session) return;

    try {
      const { id } = await tryonApi.create({
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        fitPreference: data.fitPreference,
        skinTone: data.skinTone,
        occasion: data.occasion,
        desiredVibe: data.desiredVibe,
      });
      for (const item of selectedItems) {
        await tryonApi.addItem(id, item.productId, item.category);
      }
      setRequestId(id);
      router.push("/try-on/processing");
    } catch {
      router.push("/try-on");
    }
  };

  return (
    <PageShell>
      <PageHeader
        steps={TRYON_FLOW_STEPS}
        currentStep={2}
        title="Thông tin thử mặc"
        subtitle="Nhập thông tin để AI gợi ý size, form và màu"
        showAiBadge
        backHref="/try-on/selected"
        backLabel="Outfit đang chọn"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Label>Chế độ preview</Label>
            <div className="flex flex-wrap gap-2">
              {INPUT_MODES.map((m) => (
                <Chip
                  key={m.value}
                  selected={inputMode === m.value}
                  onClick={() => setValue("inputMode", m.value)}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <Label>Chiều cao (cm)</Label>
              <Input type="number" {...register("heightCm", { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Cân nặng (kg)</Label>
              <Input type="number" {...register("weightKg", { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Size thường mặc</Label>
              <Input {...register("usualSize")} placeholder="VD: M" className="mt-1" />
            </div>
            <div>
              <Label>Gu mặc</Label>
              <Select onValueChange={(v) => setValue("fitPreference", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {FIT_PREFERENCES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Hoàn cảnh</Label>
              <Select onValueChange={(v) => setValue("occasion", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {OCCASION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vibe</Label>
              <Select onValueChange={(v) => setValue("desiredVibe", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>
                  {VIBE_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/try-on/selected">Quay lại</Link>
          </Button>
          <Button type="submit" className="flex-1" variant="ai">Tạo preview thử mặc</Button>
        </div>
      </form>
    </PageShell>
  );
}
