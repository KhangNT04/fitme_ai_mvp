"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { tryOnInputSchema, type TryOnInputForm } from "@/utils/validators";
import { FIT_PREFERENCES, SKIN_TONES, OCCASION_OPTIONS, VIBE_OPTIONS, TRYON_AVATARS } from "@/utils/constants";
import { useTryOnStore } from "@/stores/tryon-store";
import { useConsultationStore } from "@/stores/consultation-store";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { useConsumerStoresReady } from "@/hooks/use-consumer-stores-ready";
import { useHydrateConsultationProfiles } from "@/hooks/use-hydrate-consultation-profiles";
import {
  resolveTryOnFormInitial,
  resolveTryOnFormValues,
  tryOnFormToBodyProfile,
} from "@/lib/profile-prefill";
import { profileApi } from "@/services/profile-api";
import { tryonApi } from "@/services/tryon-api";
import { uploadApi } from "@/services/upload-api";
import { PageShell } from "@/components/layout/PageShell";
import { FlowWizardToolbar } from "@/components/layout/FlowWizardToolbar";
import { TRYON_FLOW_STEPS } from "@/components/layout/FlowStepper";
import { consumerPageShellClass } from "@/lib/design-tokens";
import { requiredNumberRegisterOptions, requiredKgWeightRegisterOptions, profileSnapshotKey } from "@/lib/form-number";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { getUserErrorMessage } from "@/lib/user-error-message";
import { isServerPreviewUrl } from "@/lib/media-url";
import { toast } from "@/stores/toast-store";

const NONE = "__none__";

const INPUT_MODES = [
  { value: "USER_PHOTO", label: "Dùng ảnh cá nhân" },
  { value: "AVATAR", label: "Dùng avatar mẫu" },
  { value: "OUTFIT_BOARD_ONLY", label: "Chỉ xem outfit board" },
] as const;

export default function TryOnInputPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const blobPreviewRef = useRef<string | null>(null);
  const avatarPickerSyncedRef = useRef(false);
  const uploadGenerationRef = useRef(0);
  const inputModeRef = useRef<TryOnInputForm["inputMode"]>("OUTFIT_BOARD_ONLY");
  const [consented, setConsented] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(true);
  const {
    selectedItems,
    input: savedTryOnInput,
    setInput,
    setRequestId,
    photoUploadId,
    avatarKey,
    photoPreviewUrl,
    photoQuality,
    setPhotoUploadId,
    setAvatarKey,
    setPhotoPreviewUrl,
    setPhotoQuality,
    clearPhoto,
  } = useTryOnStore();
  const { ensureSession } = useEnsureSession();
  const storesReady = useConsumerStoresReady();
  const draftBodyProfile = useConsultationStore((s) => s.draft.bodyProfile);
  const { bodyProfile: savedBodyProfile, isLoading } = useHydrateConsultationProfiles();
  const profilePrefill = useMemo(
    () => resolveTryOnFormInitial(draftBodyProfile, savedBodyProfile),
    [
      draftBodyProfile ? profileSnapshotKey(draftBodyProfile) : "",
      savedBodyProfile ? profileSnapshotKey(savedBodyProfile) : "",
    ],
  );
  const formValues = useMemo(
    (): TryOnInputForm => ({
      ...resolveTryOnFormValues(profilePrefill, savedTryOnInput),
      ...(photoUploadId ? { photoUploadId } : {}),
      ...(avatarKey ? { avatarKey } : {}),
    }),
    [profilePrefill, savedTryOnInput, photoUploadId, avatarKey],
  );
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<TryOnInputForm>({
    resolver: zodResolver(tryOnInputSchema) as Resolver<TryOnInputForm>,
    values: formValues,
  });

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (photoUploadId) setValue("photoUploadId", photoUploadId, { shouldValidate: true });
  }, [photoUploadId, setValue]);

  useEffect(() => {
    if (avatarKey) setValue("avatarKey", avatarKey, { shouldValidate: true });
  }, [avatarKey, setValue]);

  useEffect(() => {
    if (!storesReady || !photoUploadId) return;
    uploadApi.checkQuality(photoUploadId).catch(() => {
      clearPhoto();
      setValue("photoUploadId", undefined, { shouldValidate: true });
      setUploadError("Ảnh đã hết phiên — vui lòng upload lại.");
    });
  }, [storesReady, photoUploadId, clearPhoto, setValue]);

  useEffect(() => {
    if (!photoUploadId || photoQuality !== "good") return;
    if (isServerPreviewUrl(photoPreviewUrl)) return;
    uploadApi.checkQuality(photoUploadId).then((quality) => {
      if (quality.fileUrl) setPhotoPreviewUrl(quality.fileUrl);
    }).catch(() => undefined);
  }, [photoUploadId, photoPreviewUrl, photoQuality, setPhotoPreviewUrl]);

  useEffect(() => {
    if (avatarPickerSyncedRef.current || !avatarKey) return;
    avatarPickerSyncedRef.current = true;
    setShowAvatarPicker(false);
  }, [avatarKey]);

  useEffect(() => () => {
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
  }, []);

  const inputMode = watch("inputMode");
  inputModeRef.current = inputMode;
  const fitPreference = watch("fitPreference");
  const skinTone = watch("skinTone");
  const occasion = watch("occasion");
  const desiredVibe = watch("desiredVibe");

  const selectedAvatar = TRYON_AVATARS.find((a) => a.key === avatarKey);

  const handleModeChange = (mode: TryOnInputForm["inputMode"]) => {
    if (mode !== "USER_PHOTO") {
      uploadGenerationRef.current += 1;
    }
    setValue("inputMode", mode, { shouldValidate: true });
    if (mode === "OUTFIT_BOARD_ONLY") {
      clearPhoto();
      setAvatarKey(null);
      setValue("photoUploadId", undefined);
      setValue("avatarKey", undefined);
    } else if (mode === "AVATAR") {
      clearPhoto();
      setValue("photoUploadId", undefined);
      setShowAvatarPicker(!avatarKey);
    } else if (mode === "USER_PHOTO") {
      setAvatarKey(null);
      setValue("avatarKey", undefined);
      setShowAvatarPicker(true);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!consented) {
      setUploadError("Vui lòng đồng ý trước khi upload ảnh.");
      return;
    }
    const generation = ++uploadGenerationRef.current;
    const isStale = () =>
      generation !== uploadGenerationRef.current || inputModeRef.current !== "USER_PHOTO";

    setUploadError("");
    setPhotoQuality("uploading");

    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
    }
    const localPreview = URL.createObjectURL(file);
    blobPreviewRef.current = localPreview;
    setPhotoPreviewUrl(localPreview);

    try {
      const session = await ensureSession();
      if (!session) {
        setPhotoQuality("poor");
        setUploadError("Không thể tạo phiên làm việc. Vui lòng tải lại trang.");
        return;
      }
      const { consentId } = await uploadApi.consent();
      if (isStale()) return;
      const { photoUploadId: id, fileUrl } = await uploadApi.uploadPhoto(file, consentId);
      if (isStale()) return;
      setPhotoUploadId(id);
      setValue("photoUploadId", id, { shouldValidate: true });
      if (fileUrl) {
        setPhotoPreviewUrl(fileUrl);
      }
      setPhotoQuality("checking");
      const quality = await uploadApi.checkQuality(id);
      if (isStale()) return;
      if (quality.quality === "GOOD" || quality.canProceed) {
        setPhotoQuality("good");
        if (quality.fileUrl) {
          setPhotoPreviewUrl(quality.fileUrl);
        }
      } else {
        setPhotoQuality("poor");
        setUploadError(quality.message || "Ảnh chưa đạt yêu cầu. Vui lòng upload lại.");
      }
    } catch (e: unknown) {
      if (isStale()) return;
      setPhotoQuality("poor");
      setUploadError(getUserErrorMessage(e, "Upload thất bại. Vui lòng thử lại."));
    }
  };

  const handleAvatarSelect = (key: string) => {
    setAvatarKey(key);
    setValue("avatarKey", key, { shouldValidate: true });
    setShowAvatarPicker(false);
  };

  const onSubmit = async (data: TryOnInputForm) => {
    setInput({
      inputMode: data.inputMode,
      ...(data.occasion ? { occasion: data.occasion } : {}),
      ...(data.desiredVibe ? { desiredVibe: data.desiredVibe } : {}),
      ...(data.usualSize ? { usualSize: data.usualSize } : {}),
    });
    const session = await ensureSession();
    if (!session) return;

    try {
      const { id } = await tryonApi.create({
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        fitPreference: data.fitPreference,
        skinTone: data.skinTone,
        ...(data.occasion ? { occasion: data.occasion } : {}),
        ...(data.desiredVibe ? { desiredVibe: data.desiredVibe } : {}),
        ...(data.usualSize ? { usualSize: data.usualSize } : {}),
        previewMode: data.inputMode,
        ...(data.photoUploadId ? { photoUploadId: data.photoUploadId } : {}),
        ...(data.avatarKey ? { avatarKey: data.avatarKey } : {}),
      });
      for (const item of selectedItems) {
        await tryonApi.addItem(id, item.productId, item.category);
      }
      await profileApi.saveBodyProfile(tryOnFormToBodyProfile(data));
      await queryClient.invalidateQueries({ queryKey: ["body-profile"] });
      setRequestId(id);
      router.push("/try-on/processing");
    } catch (e: unknown) {
      toast.error(getUserErrorMessage(e, "Tạo preview thất bại. Vui lòng thử lại."));
    }
  };

  return (
    <PageShell width="full" className={consumerPageShellClass}>
      <FlowWizardToolbar
        steps={TRYON_FLOW_STEPS}
        currentStep={2}
        title="Thông tin thử mặc"
        subtitle="Nhập thông tin để AI gợi ý size, form và màu"
        showAiBadge
        backHref="/try-on/selected"
        backLabel="Outfit đang chọn"
      />

      {(!storesReady || isLoading) ? (
        <LoadingSkeleton className="h-96" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Label>Chế độ preview</Label>
              <div className="flex flex-wrap gap-2">
                {INPUT_MODES.map((m) => (
                  <Chip
                    key={m.value}
                    selected={inputMode === m.value}
                    onClick={() => handleModeChange(m.value)}
                  >
                    {m.label}
                  </Chip>
                ))}
              </div>

              {inputMode === "OUTFIT_BOARD_ONLY" && (
                <p className="text-sm text-muted-foreground">
                  Xem bảng phối đồ minh họa, không cần ảnh cá nhân.
                </p>
              )}

              {inputMode === "AVATAR" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chọn avatar mẫu — AI sẽ ghép outfit lên hình minh họa.
                  </p>

                  {selectedAvatar && !showAvatarPicker ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl border-2 border-primary ring-2 ring-primary/30">
                        <Image
                          src={selectedAvatar.imageUrl}
                          alt={selectedAvatar.label}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Badge className="absolute left-2 top-2 gap-1 bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                          Đã chọn
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{selectedAvatar.label}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAvatarPicker(true)}
                      >
                        Chọn avatar khác
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {TRYON_AVATARS.map((avatar) => (
                        <button
                          key={avatar.key}
                          type="button"
                          onClick={() => handleAvatarSelect(avatar.key)}
                          className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-colors ${
                            avatarKey === avatar.key
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <Image src={avatar.imageUrl} alt={avatar.label} fill className="object-cover" unoptimized />
                          {avatarKey === avatar.key && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </span>
                            </div>
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-1.5 text-center text-[10px] text-white sm:text-xs">
                            {avatar.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {errors.avatarKey && (
                    <p className="text-xs text-red-600">{errors.avatarKey.message}</p>
                  )}
                </div>
              )}

              {inputMode === "USER_PHOTO" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload ảnh toàn thân hoặc nửa người — AI sẽ ghép trang phục lên ảnh của bạn.
                  </p>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
                    <span className="text-sm text-muted-foreground">
                      Tôi đồng ý cho FitMe AI xử lý ảnh của tôi để tạo preview minh họa.
                    </span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={!consented || photoQuality === "uploading" || photoQuality === "checking"}
                    className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted transition-colors hover:border-primary/40 disabled:opacity-50"
                  >
                    {photoPreviewUrl ? (
                      <div className="relative aspect-[3/4] w-full max-w-xs">
                        <Image
                          src={photoPreviewUrl}
                          alt="Ảnh đã upload"
                          fill
                          className="object-cover"
                          unoptimized
                          onLoad={() => {
                            if (blobPreviewRef.current && !photoPreviewUrl.startsWith("blob:")) {
                              URL.revokeObjectURL(blobPreviewRef.current);
                              blobPreviewRef.current = null;
                            }
                          }}
                          onError={() => {
                            if (blobPreviewRef.current && !photoPreviewUrl.startsWith("blob:")) {
                              setPhotoPreviewUrl(blobPreviewRef.current);
                            }
                          }}
                        />
                        {(photoQuality === "uploading" || photoQuality === "checking") && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                            <Camera className="h-8 w-8 animate-pulse text-white" />
                            <span className="mt-2 text-sm text-white">
                              {photoQuality === "uploading" ? "Đang upload..." : "Đang kiểm tra chất lượng..."}
                            </span>
                          </div>
                        )}
                        {photoQuality === "good" && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-4 text-center">
                            <span className="text-xs text-white">Bấm để đổi ảnh</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-center justify-center py-10">
                        <Upload className="h-8 w-8 text-muted-foreground/70" />
                        <span className="mt-2 text-sm text-muted-foreground">
                          Chọn ảnh JPG/PNG/WEBP (tối đa 5MB)
                        </span>
                      </div>
                    )}
                  </button>
                  {photoQuality === "good" && (
                    <p className="text-xs text-green-700">Ảnh đạt chất lượng tốt.</p>
                  )}
                  {(uploadError || errors.photoUploadId) && (
                    <p className="text-xs text-red-600">
                      {uploadError || errors.photoUploadId?.message}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="heightCm">Chiều cao (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  {...register("heightCm", requiredNumberRegisterOptions)}
                  className="mt-1"
                />
                {errors.heightCm && (
                  <p className="mt-1 text-xs text-red-600">{errors.heightCm.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="weightKg">Cân nặng (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="1"
                  min={30}
                  max={200}
                  {...register("weightKg", requiredKgWeightRegisterOptions)}
                  className="mt-1"
                />
                {errors.weightKg && (
                  <p className="mt-1 text-xs text-red-600">{errors.weightKg.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="usualSize">Size thường mặc (tùy chọn)</Label>
                <Input id="usualSize" {...register("usualSize")} placeholder="VD: M" className="mt-1" />
              </div>
              <div>
                <Label>Gu mặc</Label>
                <Select
                  value={fitPreference}
                  onValueChange={(v) =>
                    setValue("fitPreference", v as TryOnInputForm["fitPreference"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    {FIT_PREFERENCES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.fitPreference && (
                  <p className="mt-1 text-xs text-red-600">{errors.fitPreference.message}</p>
                )}
              </div>
              <div>
                <Label>Tông da (tùy chọn)</Label>
                <Select
                  value={skinTone ?? NONE}
                  onValueChange={(v) =>
                    setValue("skinTone", v === NONE ? undefined : (v as TryOnInputForm["skinTone"]), {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chưa chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Chưa chọn</SelectItem>
                    {SKIN_TONES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                Hoàn cảnh và vibe là tùy chọn — bạn có thể bỏ qua và tiếp tục.
              </p>
              <div>
                <Label>Hoàn cảnh (tùy chọn)</Label>
                <Select
                  value={occasion ?? NONE}
                  onValueChange={(v) =>
                    setValue("occasion", v === NONE ? undefined : v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Chưa chọn</SelectItem>
                    {OCCASION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vibe (tùy chọn)</Label>
                <Select
                  value={desiredVibe ?? NONE}
                  onValueChange={(v) =>
                    setValue("desiredVibe", v === NONE ? undefined : v, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Chưa chọn</SelectItem>
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
            <Button type="submit" className="flex-1" variant="ai" disabled={isSubmitting || !storesReady}>
              {isSubmitting ? "Đang tạo..." : "Tạo preview thử mặc"}
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
