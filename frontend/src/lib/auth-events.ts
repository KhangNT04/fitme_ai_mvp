export const AUTH_CLEAR_EVENT = "fitme:auth-clear";
export const AUTH_DROP_ACCESS_EVENT = "fitme:auth-drop-access";
export const AUTH_TOKENS_REFRESHED_EVENT = "fitme:auth-tokens-refreshed";

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
