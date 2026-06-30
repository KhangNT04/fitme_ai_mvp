import { getUserErrorMessage } from "@/lib/user-error-message";
import { toast } from "@/stores/toast-store";

/** Standard success/error toasts for portal mutations. */
export function actionFeedback(options: {
  successMessage?: string;
  errorMessage?: string;
}) {
  return {
    onSuccess: () => {
      if (options.successMessage) toast.success(options.successMessage);
    },
    onError: (err: unknown) => {
      toast.error(getUserErrorMessage(err, options.errorMessage ?? "Thao tác thất bại"));
    },
  };
}
