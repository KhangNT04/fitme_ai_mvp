export const AUTH_CLEAR_EVENT = "fitme:auth-clear";
export const AUTH_DROP_ACCESS_EVENT = "fitme:auth-drop-access";

export function emitAuthClear(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CLEAR_EVENT));
  }
}

export function emitAuthDropAccess(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_DROP_ACCESS_EVENT));
  }
}
