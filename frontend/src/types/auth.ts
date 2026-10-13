export type UserRole = "USER" | "BRAND" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  website?: string;
  captchaId: string;
  captchaAnswer: string;
  formStartedAtMs: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  requiresEmailVerification?: boolean;
  verificationCode?: string;
  message?: string;
  /** Password accepted but the account has 2FA: no tokens yet, finish with `twoFactorToken` + a code. */
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  /** The account may enroll (admins only for now). */
  available: boolean;
  /** The admin portal refuses this account's sessions without 2FA. */
  required: boolean;
  /** The current session signed in with a code. */
  sessionVerified: boolean;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

export interface CaptchaChallenge {
  captchaId: string;
  question: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
