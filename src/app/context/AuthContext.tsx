import { createContext, useContext, useState, useCallback } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const DEMO_CREDENTIALS = [
  { email: 'raghav.kuppusamy@gmail.com', password: 'arcai2026' },
  { email: 'admin@arcai.com',            password: 'arcai2026' },
];

const DEMO_USERS: Record<string, AuthUser> = {
  'raghav.kuppusamy@gmail.com': {
    name:     'Raghavan Kuppusamy',
    email:    'raghav.kuppusamy@gmail.com',
    role:     'Engineering Manager',
    initials: 'RK',
  },
  'admin@arcai.com': {
    name:     'Arc Admin',
    email:    'admin@arcai.com',
    role:     'Administrator',
    initials: 'AA',
  },
};

const STORAGE_KEY = 'arcai_auth_user';

const DEFAULT_USER = DEMO_USERS['raghav.kuppusamy@gmail.com'];

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as AuthUser;
    } catch { /* ignore */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  });

  const login = useCallback((email: string, password: string): boolean => {
    const match = DEMO_CREDENTIALS.find(
      c => c.email === email.trim().toLowerCase() && c.password === password,
    );
    if (!match) return false;
    const authUser = DEMO_USERS[match.email];
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
