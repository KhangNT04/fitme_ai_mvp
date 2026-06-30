"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AppImage } from "@/components/common/AppImage";
import { validateImageFile } from "@/lib/upload-file";
import { cn } from "@/lib/utils";

interface BrandImageUploadProps {
  label: string;
  hint?: string;
  value?: string | null;
  onChange?: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
  aspect?: "square" | "portrait";
  className?: string;
}

export function BrandImageUpload({
  label,
  hint,
  value,
  onChange,
  onUpload,
  disabled,
  aspect = "square",
  className,
}: BrandImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await onUpload(file);
      onChange?.(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <Label>{label}</Label>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40",
            aspect === "square" ? "h-28 w-28 shrink-0" : "h-36 w-28 shrink-0",
          )}
        >
          {value ? (
            <AppImage src={value} alt="" fill className="object-cover" sizes="112px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
              <ImagePlus className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-primary/40 disabled:opacity-50 sm:py-8"
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-7 w-7 text-muted-foreground/70" />
            )}
            <span className="mt-2 text-sm font-medium text-foreground">
              {uploading ? "Đang tải lên..." : "Chọn ảnh từ thiết bị"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP — tối đa 5MB</span>
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface BrandProductImagesUploadProps {
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
}

function parseImageUrls(value: string): string[] {
  return value
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);
}

export function BrandProductImagesUpload({
  value,
  onChange,
  onUpload,
  disabled,
}: BrandProductImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const images = parseImageUrls(value);

  const setImages = (next: string[]) => {
    onChange(next.join("\n"));
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError("");
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        const validationError = validateImageFile(file);
        if (validationError) {
          throw new Error(validationError);
        }
        uploaded.push(await onUpload(file));
      }
      setImages([...images, ...uploaded]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload thất bại. Vui lòng thử lại.");
      if (uploaded.length > 0) {
        setImages([...images, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label>Ảnh sản phẩm</Label>
      <p className="mt-1 text-xs text-muted-foreground">Tải ảnh từ thiết bị hoặc dán URL bên dưới. Cần ít nhất 1 ảnh.</p>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60 bg-muted/30">
              <AppImage src={url} alt="" fill className="object-cover" sizes="120px" unoptimized />
              <button
                type="button"
                aria-label="Xóa ảnh"
                disabled={disabled || uploading}
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => e.target.files && void handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-5 text-sm font-medium transition-colors hover:border-primary/40 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Đang tải ảnh..." : "Thêm ảnh từ thiết bị"}
      </button>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"/catalog/products/sample.jpg\nhoặc https://..."}
        className="mt-3 w-full rounded-xl border border-border/60 px-3 py-2 font-mono text-xs min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled || uploading}
      />

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
