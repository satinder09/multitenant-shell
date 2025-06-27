// User types for authentication domain
// User-related interfaces and types

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserNavProps {
  user: UserProfile;
  onLogout: () => void;
  onProfileClick?: () => void;
  className?: string;
}

export interface UserMenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  emailUpdates: boolean;
  language: string;
}

export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
  settings?: Partial<UserSettings>;
} 