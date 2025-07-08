// login-response.interface.ts
export interface LoginResponse {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorSessionId?: string;
  availableMethods?: string[];
  message?: string;
}

export interface TwoFactorLoginResponse {
  accessToken: string;
  message: string;
}
