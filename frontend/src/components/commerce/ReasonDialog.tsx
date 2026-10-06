"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Used when the user leaves the field empty and `required` is false. */
  defaultReason?: string;
  required?: boolean;
  loading?: boolean;
  destructive?: boolean;
  maxLength?: number;
  onConfirm: (reason: string) => void;
}

function ReasonForm({
  label,
  placeholder,
  confirmLabel,
  defaultReason,
  required,
  loading,
  destructive,
  maxLength = 200,
  onConfirm,
  onClose,
}: Omit<ReasonDialogProps, "open" | "onOpenChange" | "title" | "description"> & { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = reason.trim() || (required ? "" : (defaultReason ?? ""));
    if (!value) {
      setError("Vui lòng nhập lý do");
      return;
    }
    setError(null);
    onConfirm(value);
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="reason-input">{label ?? "Lý do"}</Label>
        <Input
          id="reason-input"
          className="mt-1"
          value={reason}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
          Đóng
        </Button>
        <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={loading}>
          {loading ? "Đang xử lý..." : (confirmLabel ?? "Xác nhận")}
        </Button>
      </div>
    </form>
  );
}

/** Dialog collecting a short free-text reason (cancel order / reject). Form state resets on each open. */
export function ReasonDialog({ open, onOpenChange, title, description, ...rest }: ReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && <ReasonForm {...rest} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
