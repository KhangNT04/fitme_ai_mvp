import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  message = "Không thể tải dữ liệu. Vui lòng thử lại.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/80 px-6 py-16 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
      <h3 className="font-display text-lg font-semibold text-red-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
