// Authentication domain types
// Core authentication interfaces and types

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  tenants: AuthUserTenant[];
}

export interface AuthUserTenant {
  id: string;
  name: string;
  subdomain: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
} 