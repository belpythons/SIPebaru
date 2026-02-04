import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SipebaruUser {
  fid: number;
  nama: string;
  npk: string;
  unit_kerja: string;
  rfid: string | null;
  email: string | null;
}

interface SipebaruAuthContextType {
  user: SipebaruUser | null;
  isLoading: boolean;
  login: (user: SipebaruUser) => void;
  logout: () => void;
}

const SipebaruAuthContext = createContext<SipebaruAuthContextType | undefined>(undefined);

const STORAGE_KEY = "sipebaru_user";

export const SipebaruAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SipebaruUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: SipebaruUser) => {
    setUser(userData);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SipebaruAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </SipebaruAuthContext.Provider>
  );
};

export const useSipebaruAuth = () => {
  const context = useContext(SipebaruAuthContext);
  if (context === undefined) {
    throw new Error("useSipebaruAuth must be used within a SipebaruAuthProvider");
  }
  return context;
};
