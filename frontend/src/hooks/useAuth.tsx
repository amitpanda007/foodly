import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginRequest, SignupRequest } from '../types';

const AUTH_STORAGE_KEY = 'foodly:auth';
const ANONYMOUS_ID_KEY = 'foodly:userId';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  anonymousUserId: string;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  
  const generated = crypto.randomUUID?.() || `foodly-${Date.now()}`;
  localStorage.setItem(ANONYMOUS_ID_KEY, generated);
  return generated;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonymousUserId] = useState(getAnonymousUserId);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as AuthTokens;
        setUser(data.user);
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Save auth state to localStorage
  const saveAuth = useCallback((tokens: AuthTokens) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
    setUser(tokens.user);
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const tokens: AuthTokens = await response.json();
    saveAuth(tokens);

    // Migrate anonymous recipes to authenticated user
    try {
      await fetch(`${API_URL}/api/recipes/migrate?anonymous_user_id=${encodeURIComponent(anonymousUserId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });
    } catch {
      // Ignore migration errors
    }
  }, [saveAuth, anonymousUserId]);

  const signup = useCallback(async (data: SignupRequest) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Signup failed' }));
      throw new Error(error.detail || 'Signup failed');
    }

    const tokens: AuthTokens = await response.json();
    saveAuth(tokens);

    // Migrate anonymous recipes to new user
    try {
      await fetch(`${API_URL}/api/recipes/migrate?anonymous_user_id=${encodeURIComponent(anonymousUserId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });
    } catch {
      // Ignore migration errors
    }
  }, [saveAuth, anonymousUserId]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const tokens: AuthTokens = await response.json();
      saveAuth(tokens);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [refreshToken, saveAuth, clearAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        accessToken,
        anonymousUserId,
        login,
        signup,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

