export const AUTH_CLEAR_EVENT = "fitme:auth-clear";
export const AUTH_DROP_ACCESS_EVENT = "fitme:auth-drop-access";
export const AUTH_TOKENS_REFRESHED_EVENT = "fitme:auth-tokens-refreshed";
/** Fired when the session can no longer be renewed: the viewer has to sign in again. */
export const AUTH_SESSION_EXPIRED_EVENT = "fitme:auth-session-expired";

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

export function emitAuthTokensRefreshed(tokens: RefreshedTokens): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<RefreshedTokens>(AUTH_TOKENS_REFRESHED_EVENT, { detail: tokens }));
  }
}

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

/** The session is gone for good — callers must send the viewer back to the sign-in page. */
export function emitAuthSessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}
