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
