import { createContext, useContext, useState, useCallback } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, remember?: boolean) => boolean;
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as AuthUser;
    } catch { /* ignore */ }
    return null;
  });

  const login = useCallback((email: string, password: string, remember: boolean = true): boolean => {
    const match = DEMO_CREDENTIALS.find(
      c => c.email === email.trim().toLowerCase() && c.password === password,
    );
    if (!match) return false;
    const authUser = DEMO_USERS[match.email];
    setUser(authUser);
    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
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
