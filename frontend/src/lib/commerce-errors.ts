import { getApiErrorCode } from "@/services/api-client";
import { commerceErrorMessage } from "@/lib/commerce-labels";
import { getUserErrorMessage } from "@/lib/user-error-message";

/** Prefer a friendly message for known commerce `errorCode`s, else fall back to the server message. */
export function getCommerceErrorMessage(error: unknown, fallback: string): string {
  return commerceErrorMessage(getApiErrorCode(error)) ?? getUserErrorMessage(error, fallback);
}
