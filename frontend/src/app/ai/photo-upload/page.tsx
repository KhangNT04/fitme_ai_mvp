"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Disclaimer } from "@/components/layout/Disclaimer";
import { uploadApi } from "@/services/upload-api";
import { useConsultationStore } from "@/stores/consultation-store";
import { PageSuspense } from "@/components/common/PageSuspense";

export default function PhotoUploadPage() {
  return (
    <PageSuspense>
      <PhotoUploadContent />
    </PageSuspense>
  );
}

function PhotoUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recommendationId = searchParams.get("recommendation");
  const fileRef = useRef<HTMLInputElement>(null);
  const [consented, setConsented] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { setPhotoUploadId } = useConsultationStore();

  const handleUpload = async (file: File) => {
    if (!consented) {
      setError("Vui lòng đồng ý trước khi upload ảnh.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      await uploadApi.consent();
      const { photoUploadId } = await uploadApi.uploadPhoto(file);
      setPhotoUploadId(photoUploadId);
      router.push(`/ai/photo-check?photo=${photoUploadId}&recommendation=${recommendationId || ""}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Upload thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900">Upload ảnh preview 2D</h1>
      <p className="mt-2 text-stone-500">Ảnh sẽ được dùng để tạo minh họa outfit trên hình của bạn</p>

      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold">Hướng dẫn chụp ảnh</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>• Đứng thẳng, toàn thân hoặc nửa người trở lên</li>
            <li>• Ánh sáng đủ, nền đơn giản</li>
            <li>• Không che khuất phần thân</li>
            <li>• Định dạng JPG/PNG, tối đa 10MB</li>
          </ul>
        </CardContent>
      </Card>

      <label className="mt-6 flex items-start gap-3 rounded-lg border border-stone-200 p-4">
        <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
        <span className="text-sm text-stone-600">
          Tôi đồng ý cho FitMe AI xử lý ảnh của tôi để tạo preview minh họa.
          Ảnh sẽ không được chia sẻ với thương hiệu.
        </span>
      </label>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || !consented}
        className="mt-6 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 py-16 transition-colors hover:border-stone-400 disabled:opacity-50"
      >
        {uploading ? (
          <Camera className="h-10 w-10 animate-pulse text-stone-400" />
        ) : (
          <Upload className="h-10 w-10 text-stone-400" />
        )}
        <p className="mt-4 font-medium text-stone-700">
          {uploading ? "Đang tải lên..." : "Kéo thả hoặc chọn ảnh"}
        </p>
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <Disclaimer className="mt-6" />
    </div>
  );
}
