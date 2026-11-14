export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string;
  timezone: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isRegistrationAllowed: boolean;
  userCount: number;
  maxUsers: number;
  remainingSlots: number;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  quickLogin: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

